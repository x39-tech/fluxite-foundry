// Calls into the desktop app's sACN output (src-tauri/src/sacn_output.rs).

import { invoke } from "@tauri-apps/api/core";

export const UNIVERSE_SIZE = 512;
export const MIN_UNIVERSE = 1;
export const MAX_UNIVERSE = 63999;

export interface NetworkInterface {
  name: string;
  ipv4Addresses: string[];
  ipv6Addresses: string[];
  isLoopback: boolean;
}

/** Lists the network interfaces that are up. */
export function listNetworkInterfaces(): Promise<NetworkInterface[]> {
  return invoke<NetworkInterface[]>("sacn_list_interfaces");
}

/**
 * Starts transmitting on a universe from the named interface, replacing
 * whatever was being transmitted before.
 */
export function startSacnOutput(
  interfaceName: string,
  universe: number,
): Promise<void> {
  return invoke("sacn_start", { interfaceName, universe });
}

export function stopSacnOutput(): Promise<void> {
  return invoke("sacn_stop");
}

/** Sets the levels of the universe being transmitted. */
export function setSacnLevels(frame: Uint8Array): Promise<void> {
  return invoke("sacn_set_levels", frame);
}
