# sACN WebSocket Server

A WebSocket server that receives DMX data from the Fluxite Foundry DMX Controller and outputs it as sACN (Streaming ACN/E1.31).

## Features

- ✅ WebSocket endpoint for receiving DMX data from Fluxite Foundry
- ✅ sACN (E1.31) packet generation and multicast transmission
- ✅ Automatic universe registration
- ✅ Support for 512 DMX slots per universe
- ✅ Configurable offset support

## Usage

### Running the server

```bash
cd tools/sacn-server
cargo run -- --interface en0
```

Replace `en0` with your network interface name. Common interface names:
- **macOS**: `en0` (Wi-Fi), `en1` (Ethernet), `lo0` (loopback)
- **Linux**: `eth0`, `wlan0`, `lo`
- **Windows**: Use `ipconfig` to find your interface

The server will start on `ws://127.0.0.1:3000` by default.

**Options**:
- `--interface <NAME>` (required): Network interface for multicast
- `--port <PORT>`: WebSocket port (default: 3000)

**Example**:
```bash
cargo run -- --interface en0 --port 8080
```

### Connecting from Fluxite Foundry

1. In Fluxite Foundry, navigate to the DMX Controller
2. In the "Server" section, enter: `127.0.0.1:3000`
3. Click "Connect"

### Data Format

The server receives JSON messages with the following structure:

```json
{
  "universe": 2,
  "offset": 0,
  "slots": [0, 255, 128, ...]
}
```

- `universe`: DMX universe number (u16)
- `offset`: Starting slot offset (u16)
- `slots`: Array of DMX slot values 0-255 (Vec<u8>)

## How it Works

1. The server listens for WebSocket connections on `ws://127.0.0.1:3000`
2. When DMX data is received via WebSocket, it:
   - Parses the JSON payload
   - Converts the partial DMX data (offset + slots) into a full 512-slot DMX frame
   - Builds an E1.31 (sACN) packet with proper headers
   - Sends the data via UDP multicast to the network
3. sACN packets are transmitted to multicast addresses based on universe number:
   - Universe 1-256: `239.255.0.x` where x = (universe - 1)
   - Universe 257+: `239.255.y.z` where y = (universe - 1) / 256, z = (universe - 1) % 256
   - All packets sent to port 5568

## Development

### Viewing logs

The server uses `tracing` for logging. To see debug logs:

```bash
RUST_LOG=debug cargo run
```

### Configuration

The server currently uses these defaults:
- **WebSocket Port**: 3000
- **sACN Destination Port**: 5568 (standard sACN multicast port)
- **sACN Source Name**: "Fluxite Foundry sACN Bridge"
- **Multicast TTL**: 1 (local network only)
- **Multicast Loopback**: Enabled
- **Priority**: 100
