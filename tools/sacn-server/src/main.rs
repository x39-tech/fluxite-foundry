mod sacn;

use axum::{
    Router,
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
    routing::get,
};
use clap::Parser;
use serde::Deserialize;
use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::net::UdpSocket;
use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

use sacn::{SacnPacket, multicast_addr_for_universe};

#[derive(Debug, Deserialize)]
struct DmxPayload {
    universe: u16,
    offset: u16,
    slots: Vec<u8>,
}

/// State for a single universe
#[derive(Clone)]
struct UniverseState {
    /// Full 512-byte DMX frame
    dmx_data: Vec<u8>,
    /// Number of redundant packets sent for current unchanging data (0-3)
    redundant_packet_count: u8,
    /// Last time any packet was sent for this universe
    last_sent: Instant,
    /// Time when data last changed
    last_data_change: Instant,
}

impl UniverseState {
    fn new() -> Self {
        let now = Instant::now();
        Self {
            dmx_data: vec![0u8; 512],
            redundant_packet_count: 0,
            last_sent: now,
            last_data_change: now,
        }
    }
}

/// Shared state for sACN transmission
struct AppState {
    socket: Arc<UdpSocket>,
    sacn_packet: Arc<Mutex<SacnPacket>>,
}

const SACN_PORT: u16 = 5568;

/// sACN WebSocket Bridge - Receives DMX data via WebSocket and transmits as sACN
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Network interface to use for multicast (e.g., en0, en1, eth0)
    #[arg(short, long)]
    interface: String,

    /// WebSocket port to listen on
    #[arg(short, long, default_value_t = 3000)]
    port: u16,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "sacn_server=info,tower_http=debug,axum=trace".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Get the IP address of the specified interface
    let interface_ip = get_interface_ip(&args.interface)
        .unwrap_or_else(|_| panic!("Failed to get IP address for interface {}", args.interface));

    info!(
        "Using network interface {} ({})",
        args.interface, interface_ip
    );

    // Create UDP socket for sending sACN
    info!("Initializing sACN sender...");

    // Use socket2 to set multicast interface
    let socket2 = socket2::Socket::new(
        socket2::Domain::IPV4,
        socket2::Type::DGRAM,
        Some(socket2::Protocol::UDP),
    )
    .expect("Failed to create socket");

    socket2
        .set_multicast_if_v4(&interface_ip)
        .expect("Failed to set multicast interface");

    info!("Set multicast interface to {}", interface_ip);

    socket2
        .set_multicast_loop_v4(true)
        .expect("Failed to set multicast loop");
    socket2
        .set_multicast_ttl_v4(64)
        .expect("Failed to set multicast TTL");

    // Set non-blocking for tokio
    socket2
        .set_nonblocking(true)
        .expect("Failed to set non-blocking");

    let socket = UdpSocket::from_std(socket2.into()).expect("Failed to convert to tokio socket");

    info!("UDP socket bound to {}", socket.local_addr().unwrap());

    // Create sACN packet builder
    let cid = Uuid::new_v4();
    let sacn_packet = SacnPacket::new("Fluxite Foundry sACN Bridge".to_string(), cid);
    info!("sACN source initialized with CID: {}", cid);

    // Wrap in Arc for sharing across connections
    let state = Arc::new(AppState {
        socket: Arc::new(socket),
        sacn_packet: Arc::new(Mutex::new(sacn_packet)),
    });

    // Build the application with WebSocket route
    let app = Router::new().route("/", get(ws_handler)).with_state(state);

    // Run the server
    let addr = SocketAddr::from(([127, 0, 0, 1], args.port));
    info!("sACN WebSocket server listening on {}", addr);
    info!(
        "Connect from Fluxite Foundry using: 127.0.0.1:{}",
        args.port
    );

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/// Get the IPv4 address of a network interface
fn get_interface_ip(interface_name: &str) -> Result<Ipv4Addr, String> {
    use nix::ifaddrs::getifaddrs;

    let ifaddrs = getifaddrs().map_err(|e| format!("Failed to get interfaces: {}", e))?;

    for ifaddr in ifaddrs {
        if ifaddr.interface_name == interface_name
            && let Some(address) = ifaddr.address
            && let Some(sockaddr) = address.as_sockaddr_in()
        {
            return Ok(sockaddr.ip());
        }
    }

    Err(format!(
        "Interface {} not found or has no IPv4 address",
        interface_name
    ))
}

/// WebSocket upgrade handler
async fn ws_handler(
    ws: WebSocketUpgrade,
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

/// Handle individual WebSocket connections
async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    info!("New WebSocket connection established");

    // Per-connection universe tracking
    let mut universes: HashMap<u16, UniverseState> = HashMap::new();

    let mut keepalive_interval = tokio::time::interval(Duration::from_millis(50));
    keepalive_interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            // Handle incoming WebSocket messages
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        // Parse the JSON payload
                        match serde_json::from_str::<DmxPayload>(&text) {
                            Ok(payload) => {
                                debug!(
                                    "Received DMX data - Universe: {}, Offset: {}, Slots: {} bytes",
                                    payload.universe,
                                    payload.offset,
                                    payload.slots.len()
                                );

                                // Send via sACN with timing logic
                                if let Err(e) = send_sacn_data(&state, &mut universes, payload).await {
                                    error!("Failed to send sACN data: {}", e);
                                }
                            }
                            Err(e) => {
                                warn!("Failed to parse DMX payload: {}", e);
                            }
                        }
                    }
                    Some(Ok(Message::Binary(data))) => {
                        info!("Received binary message: {} bytes", data.len());
                    }
                    Some(Ok(Message::Ping(_))) => {
                        // Axum handles pong automatically
                    }
                    Some(Ok(Message::Pong(_))) => {}
                    Some(Ok(Message::Close(_))) => {
                        info!("WebSocket connection closed");
                        break;
                    }
                    Some(Err(e)) => {
                        warn!("WebSocket error: {}", e);
                        break;
                    }
                    None => {
                        info!("WebSocket stream ended");
                        break;
                    }
                }
            }

            // Handle keep-alive timer
            _ = keepalive_interval.tick() => {
                if let Err(e) = send_keepalives(&state, &mut universes).await {
                    error!("Failed to send keep-alive: {}", e);
                }
            }
        }
    }

    info!("WebSocket connection terminated");
}

/// Send sACN data when new WebSocket data arrives
async fn send_sacn_data(
    state: &AppState,
    universes: &mut HashMap<u16, UniverseState>,
    payload: DmxPayload,
) -> Result<(), Box<dyn std::error::Error>> {
    // Get or create universe state
    let univ_state = universes
        .entry(payload.universe)
        .or_insert_with(UniverseState::new);

    // Update DMX data with new values
    let start_offset = payload.offset as usize;
    let end_offset = std::cmp::min(start_offset + payload.slots.len(), 512);

    let mut data_changed = false;
    if start_offset < 512 {
        let copy_len = end_offset - start_offset;
        // Check if data actually changed
        if univ_state.dmx_data[start_offset..end_offset] != payload.slots[..copy_len] {
            data_changed = true;
            univ_state.dmx_data[start_offset..end_offset]
                .copy_from_slice(&payload.slots[..copy_len]);
        }
    }

    if data_changed {
        // Data changed - send immediately and reset redundant packet counter
        send_packet(state, payload.universe, &univ_state.dmx_data).await?;

        univ_state.redundant_packet_count = 0;
        univ_state.last_sent = Instant::now();
        univ_state.last_data_change = Instant::now();
    }

    Ok(())
}

/// Send keep-alive and redundant packets
async fn send_keepalives(
    state: &AppState,
    universes: &mut HashMap<u16, UniverseState>,
) -> Result<(), Box<dyn std::error::Error>> {
    let now = Instant::now();

    for (&universe, univ_state) in universes.iter_mut() {
        let time_since_sent = now.duration_since(univ_state.last_sent);

        if univ_state.redundant_packet_count < 3 {
            // Still in the 3-packet burst phase after data stopped changing
            // Send packets at the interval that this function is called.
            send_packet(state, universe, &univ_state.dmx_data).await?;
            univ_state.redundant_packet_count += 1;
            univ_state.last_sent = now;

            debug!(
                "Sent redundant packet {} of 3 for universe {}",
                univ_state.redundant_packet_count, universe
            );
        } else {
            // Burst complete, now in keep-alive phase (800-1000ms)
            if time_since_sent >= Duration::from_millis(800) {
                send_packet(state, universe, &univ_state.dmx_data).await?;
                univ_state.last_sent = now;

                debug!("Sent keep-alive for universe {}", universe);
            }
        }
    }

    Ok(())
}

/// Send a single sACN packet
async fn send_packet(
    state: &AppState,
    universe: u16,
    dmx_data: &[u8],
) -> Result<(), Box<dyn std::error::Error>> {
    let mut sacn = state.sacn_packet.lock().await;
    let packet = sacn.build_packet(universe, dmx_data);

    let multicast_addr = multicast_addr_for_universe(universe);
    let dest = SocketAddr::new(IpAddr::V4(multicast_addr), SACN_PORT);

    state.socket.send_to(&packet, dest).await?;

    Ok(())
}
