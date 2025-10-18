use byteorder::{BigEndian, WriteBytesExt};
use std::io::Write;
use uuid::Uuid;

/// E1.31 (sACN) packet builder
/// Reference: ANSI E1.31 – 2018
pub struct SacnPacket {
    source_name: String,
    cid: Uuid,
    universe: u16,
    sequence: u8,
    priority: u8,
}

impl SacnPacket {
    pub fn new(source_name: String, cid: Uuid) -> Self {
        Self {
            source_name,
            cid,
            universe: 1,
            sequence: 0,
            priority: 100,
        }
    }

    /// Build an E1.31 packet with the given DMX data
    pub fn build_packet(&mut self, universe: u16, dmx_data: &[u8]) -> Vec<u8> {
        self.universe = universe;
        self.sequence = self.sequence.wrapping_add(1);

        let mut packet = Vec::with_capacity(638); // Max sACN packet size

        // Root Layer
        self.write_root_layer(&mut packet);

        // Framing Layer
        self.write_framing_layer(&mut packet);

        // DMP Layer
        self.write_dmp_layer(&mut packet, dmx_data);

        packet
    }

    fn write_root_layer(&self, buf: &mut Vec<u8>) {
        // Preamble Size (2 bytes)
        buf.write_u16::<BigEndian>(0x0010).unwrap();

        // Post-amble Size (2 bytes)
        buf.write_u16::<BigEndian>(0x0000).unwrap();

        // ACN Packet Identifier (12 bytes)
        buf.write_all(b"ASC-E1.17\x00\x00\x00").unwrap();

        // Flags and Length (2 bytes) - will be updated later
        let flags_and_length_pos = buf.len();
        buf.write_u16::<BigEndian>(0x7000).unwrap(); // Placeholder

        // Vector (4 bytes) - E1.31 Data Packet
        buf.write_u32::<BigEndian>(0x00000004).unwrap();

        // CID (16 bytes)
        buf.write_all(self.cid.as_bytes()).unwrap();

        // Update flags and length
        let root_length = buf.len() - flags_and_length_pos + 638 - buf.len();
        buf[flags_and_length_pos..flags_and_length_pos + 2]
            .copy_from_slice(&((0x7000 | root_length as u16).to_be_bytes()));
    }

    fn write_framing_layer(&self, buf: &mut Vec<u8>) {
        // Flags and Length (2 bytes) - will be updated later
        let flags_and_length_pos = buf.len();
        buf.write_u16::<BigEndian>(0x7000).unwrap(); // Placeholder

        // Vector (4 bytes) - E1.31 Data Packet
        buf.write_u32::<BigEndian>(0x00000002).unwrap();

        // Source Name (64 bytes) - UTF-8, null-terminated
        let mut source_name_bytes = [0u8; 64];
        let name_bytes = self.source_name.as_bytes();
        let copy_len = name_bytes.len().min(63); // Leave room for null terminator
        source_name_bytes[..copy_len].copy_from_slice(&name_bytes[..copy_len]);
        buf.write_all(&source_name_bytes).unwrap();

        // Priority (1 byte)
        buf.write_u8(self.priority).unwrap();

        // Synchronization Address (2 bytes) - 0 = no sync
        buf.write_u16::<BigEndian>(0x0000).unwrap();

        // Sequence Number (1 byte)
        buf.write_u8(self.sequence).unwrap();

        // Options (1 byte) - bit 7: Preview, bit 6: Stream Terminated
        buf.write_u8(0x00).unwrap();

        // Universe (2 bytes)
        buf.write_u16::<BigEndian>(self.universe).unwrap();

        // Update flags and length
        let framing_length = 638 - flags_and_length_pos;
        buf[flags_and_length_pos..flags_and_length_pos + 2]
            .copy_from_slice(&((0x7000 | framing_length as u16).to_be_bytes()));
    }

    fn write_dmp_layer(&self, buf: &mut Vec<u8>, dmx_data: &[u8]) {
        let slot_count = dmx_data.len().min(512);

        // Flags and Length (2 bytes)
        let dmp_length = 11 + slot_count;
        buf.write_u16::<BigEndian>(0x7000 | dmp_length as u16)
            .unwrap();

        // Vector (1 byte) - Set Property
        buf.write_u8(0x02).unwrap();

        // Address Type & Data Type (1 byte)
        buf.write_u8(0xa1).unwrap();

        // First Property Address (2 bytes) - 0 = START code
        buf.write_u16::<BigEndian>(0x0000).unwrap();

        // Address Increment (2 bytes) - always 1
        buf.write_u16::<BigEndian>(0x0001).unwrap();

        // Property value count (2 bytes) - START code + DMX slots
        buf.write_u16::<BigEndian>((slot_count + 1) as u16).unwrap();

        // START code (1 byte) - 0x00 for normal DMX
        buf.write_u8(0x00).unwrap();

        // DMX data (up to 512 bytes)
        buf.write_all(&dmx_data[..slot_count]).unwrap();
    }
}

/// Calculate the multicast address for a given universe
/// E1.31 uses 239.255.0.0 through 239.255.255.255
pub fn multicast_addr_for_universe(universe: u16) -> std::net::Ipv4Addr {
    let high_byte = ((universe) / 256) as u8;
    let low_byte = ((universe) % 256) as u8;
    std::net::Ipv4Addr::new(239, 255, high_byte, low_byte)
}
