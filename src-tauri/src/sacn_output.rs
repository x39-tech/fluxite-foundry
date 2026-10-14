//! Live sACN output for the DMX test controller.
//!
//! The frontend chooses a network interface and universe and streams DMX
//! frames here. A single background task owns the sACN source and transmits
//! frame data via the sACN library.
//!
//! Only one universe is transmitted at a time across all editors.

use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::time::Duration;

use sacn::tokio::Source;
use sacn::{AdapterError, Cid, MulticastInterface, SourceConfig, Universe, UniverseConfig};
use serde::Serialize;
use tauri::ipc::{InvokeBody, Request};
use tauri::{AppHandle, Manager, State};
use tokio::sync::{mpsc, oneshot, watch};
use tokio::time::{sleep_until, timeout};

const SOURCE_NAME: &str = "Fluxite Foundry";
const UNIVERSE_SIZE: usize = 512;

// How long to keep transmitting the stream-terminated packets of a universe
// that is being stopped before giving up on them.
const TERMINATION_TIMEOUT: Duration = Duration::from_secs(1);

/// A network interface as presented to the frontend.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkInterface {
    name: String,
    ipv4_addresses: Vec<Ipv4Addr>,
    ipv6_addresses: Vec<Ipv6Addr>,
    is_loopback: bool,
}

enum Command {
    Start {
        interface: Ipv4Addr,
        universe: Universe,
        reply: oneshot::Sender<Result<(), String>>,
    },
    Stop {
        reply: oneshot::Sender<()>,
    },
}

/// Handle to the output task, kept in Tauri's managed state.
pub struct SacnOutput {
    commands: mpsc::UnboundedSender<Command>,
    levels: watch::Sender<Vec<u8>>,
}

/// Spawns the output task and registers its handle with the app.
pub fn init(app: &AppHandle) {
    let (commands, command_rx) = mpsc::unbounded_channel();
    let (levels, levels_rx) = watch::channel(vec![0; UNIVERSE_SIZE]);
    tauri::async_runtime::spawn(run_output(command_rx, levels_rx));
    app.manage(SacnOutput { commands, levels });
}

/// Lists the interfaces that are up, grouped by name.
#[tauri::command]
pub fn sacn_list_interfaces() -> Result<Vec<NetworkInterface>, String> {
    let addrs = if_addrs::get_if_addrs().map_err(|e| e.to_string())?;

    let mut interfaces: Vec<NetworkInterface> = Vec::new();
    let mut index_by_name: HashMap<String, usize> = HashMap::new();
    for addr in addrs.into_iter().filter(|a| a.is_oper_up()) {
        let index = *index_by_name.entry(addr.name.clone()).or_insert_with(|| {
            interfaces.push(NetworkInterface {
                name: addr.name.clone(),
                ipv4_addresses: Vec::new(),
                ipv6_addresses: Vec::new(),
                is_loopback: addr.is_loopback(),
            });
            interfaces.len() - 1
        });
        let interface = &mut interfaces[index];
        match addr.ip() {
            IpAddr::V4(ip) => interface.ipv4_addresses.push(ip),
            IpAddr::V6(ip) => interface.ipv6_addresses.push(ip),
        }
    }

    Ok(interfaces)
}

/// Starts transmitting on `universe` from the named interface, replacing any
/// universe that is already being transmitted.
#[tauri::command]
pub async fn sacn_start(
    output: State<'_, SacnOutput>,
    interface_name: String,
    universe: u16,
) -> Result<(), String> {
    let universe = Universe::new(universe).map_err(|e| e.to_string())?;
    let interface = ipv4_address_of(&interface_name)?;

    let (reply, response) = oneshot::channel();
    output
        .commands
        .send(Command::Start {
            interface,
            universe,
            reply,
        })
        .map_err(|_| "sACN output is not running".to_string())?;
    response
        .await
        .map_err(|_| "sACN output is not running".to_string())?
}

/// Stops transmitting, sending the stream-terminated packets first.
#[tauri::command]
pub async fn sacn_stop(output: State<'_, SacnOutput>) -> Result<(), String> {
    let (reply, response) = oneshot::channel();
    output
        .commands
        .send(Command::Stop { reply })
        .map_err(|_| "sACN output is not running".to_string())?;
    response
        .await
        .map_err(|_| "sACN output is not running".to_string())
}

/// Sets the levels to transmit. The body is the raw bytes of a full universe;
/// a shorter frame is padded with zeros.
#[tauri::command]
pub fn sacn_set_levels(output: State<'_, SacnOutput>, request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("expected the levels as a raw byte body".to_string());
    };
    if bytes.len() > UNIVERSE_SIZE {
        return Err(format!(
            "a universe has {UNIVERSE_SIZE} slots, got {}",
            bytes.len()
        ));
    }

    let mut levels = bytes.clone();
    levels.resize(UNIVERSE_SIZE, 0);
    output.levels.send_replace(levels);
    Ok(())
}

// Gets the first IPv4 address assigned to the interface with the given name.
fn ipv4_address_of(interface_name: &str) -> Result<Ipv4Addr, String> {
    let addrs = if_addrs::get_if_addrs().map_err(|e| e.to_string())?;
    addrs
        .into_iter()
        .filter(|a| a.name == interface_name)
        .find_map(|a| match a.ip() {
            IpAddr::V4(ip) => Some(ip),
            IpAddr::V6(_) => None,
        })
        .ok_or_else(|| format!("network interface {interface_name} has no IPv4 address"))
}

struct ActiveSource {
    source: Source,
    universe: Universe,
}

async fn run_output(
    mut commands: mpsc::UnboundedReceiver<Command>,
    mut levels: watch::Receiver<Vec<u8>>,
) {
    // One CID per run of the app
    let cid = Cid::from_bytes(*uuid::Uuid::new_v4().as_bytes());
    let mut active: Option<ActiveSource> = None;

    loop {
        tokio::select! {
            command = commands.recv() => {
                let Some(command) = command else { break };
                match command {
                    Command::Start { interface, universe, reply } => {
                        if let Some(previous) = active.take() {
                            terminate(previous).await;
                        }
                        let initial_levels = levels.borrow_and_update().clone();
                        match start(cid, interface, universe, &initial_levels).await {
                            Ok(source) => {
                                active = Some(source);
                                let _ = reply.send(Ok(()));
                            }
                            Err(e) => {
                                let _ = reply.send(Err(e));
                            }
                        }
                    }
                    Command::Stop { reply } => {
                        if let Some(previous) = active.take() {
                            terminate(previous).await;
                        }
                        let _ = reply.send(());
                    }
                }
            }
            Ok(()) = levels.changed() => {
                if let Some(ActiveSource { source, universe }) = &mut active {
                    source.update_levels(*universe, &levels.borrow_and_update());
                }
            }
            error = transmit(&mut active) => {
                eprintln!("sACN output failed: {error}");
                active = None;
            }
        }
    }
}

// Runs the active source until it fails. If there is no active source, returns
// an always-pending future.
async fn transmit(active: &mut Option<ActiveSource>) -> AdapterError {
    match active {
        Some(ActiveSource { source, .. }) => {
            let Err(error) = source.run().await;
            error
        }
        None => std::future::pending().await,
    }
}

async fn start(
    cid: Cid,
    interface: Ipv4Addr,
    universe: Universe,
    levels: &[u8],
) -> Result<ActiveSource, String> {
    let mut source = Source::bind(SourceConfig::new(cid, SOURCE_NAME))
        .await
        .map_err(|e| e.to_string())?;
    source
        .add_universe_on(
            UniverseConfig::new(universe),
            MulticastInterface::V4(interface),
        )
        .map_err(|e| e.to_string())?;
    source.update_levels(universe, levels);
    Ok(ActiveSource { source, universe })
}

// Run the sACN termination sequence and wait for it to finish.
async fn terminate(
    ActiveSource {
        mut source,
        universe,
    }: ActiveSource,
) {
    source.remove_universe(universe);
    let drained = timeout(TERMINATION_TIMEOUT, async {
        while let Ok(Some(next)) = source.process().await {
            sleep_until(next).await;
        }
    })
    .await;
    if drained.is_err() {
        eprintln!("sACN output timed out sending stream-terminated packets");
    }
}
