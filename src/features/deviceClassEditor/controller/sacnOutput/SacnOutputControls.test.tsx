import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "test/render";
import { EntityId } from "app/persistentState";
import { resetAppRuntimeStore } from "test/utils";
import {
  listNetworkInterfaces,
  NetworkInterface,
  setSacnLevels,
} from "./native";
import { SacnOutputControls } from "./SacnOutputControls";

vi.mock("./native", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./native")>()),
  listNetworkInterfaces: vi.fn(),
  setSacnLevels: vi.fn(() => Promise.resolve()),
}));

const documentId = "doc" as EntityId;

const loopback: NetworkInterface = {
  name: "lo0",
  ipv4Addresses: ["127.0.0.1"],
  ipv6Addresses: ["::1"],
  isLoopback: true,
};
const ethernet: NetworkInterface = {
  name: "en0",
  ipv4Addresses: ["192.168.1.20", "10.0.0.5"],
  ipv6Addresses: [],
  isLoopback: false,
};
const wifi: NetworkInterface = {
  name: "en1",
  ipv4Addresses: ["192.168.2.30"],
  ipv6Addresses: [],
  isLoopback: false,
};
const ipv6Only: NetworkInterface = {
  name: "utun0",
  ipv4Addresses: [],
  ipv6Addresses: ["fe80::1"],
  isLoopback: false,
};

function renderControls(dmxValues = new Uint8Array([10, 20, 30])) {
  const user = userEvent.setup();
  const result = render(
    <SacnOutputControls documentId={documentId} dmxValues={dmxValues} />,
  );
  return { user, ...result };
}

// The levels most recently sent, as a full universe.
function lastSentFrame(): number[] {
  const frame = vi.mocked(setSacnLevels).mock.lastCall?.[0];
  return frame ? Array.from(frame) : [];
}

const sendCheckbox = () => screen.getByRole("checkbox", { name: "Send sACN" });
const interfaceSelect = () =>
  screen.getByRole("combobox", { name: "Interface" });

beforeEach(() => {
  vi.clearAllMocks();
  resetAppRuntimeStore();
  vi.mocked(listNetworkInterfaces).mockResolvedValue([
    loopback,
    ethernet,
    wifi,
    ipv6Only,
  ]);
});

describe("choosing an interface", () => {
  it("starts with the first interface on a real network", async () => {
    renderControls();

    await waitFor(() => expect(interfaceSelect()).toHaveTextContent("en0"));
  });

  it("lists interfaces by name with their IPv4 addresses", async () => {
    const { user } = renderControls();
    await waitFor(() => expect(interfaceSelect()).toHaveTextContent("en0"));

    await user.click(interfaceSelect());

    expect(
      screen.getByRole("option", { name: "en0 192.168.1.20, 10.0.0.5" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "utun0 No IPv4 address" }),
    ).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("option", { name: /^en1/ }));

    expect(interfaceSelect()).toHaveTextContent("en1");
  });

  it("cannot send until there is an interface to send from", async () => {
    vi.mocked(listNetworkInterfaces).mockResolvedValue([ipv6Only]);
    renderControls();

    await waitFor(() => expect(listNetworkInterfaces).toHaveBeenCalled());

    expect(sendCheckbox()).toBeDisabled();
  });
});

describe("sending", () => {
  it("sends nothing until turned on", async () => {
    renderControls();
    await waitFor(() => expect(sendCheckbox()).toBeEnabled());

    expect(setSacnLevels).not.toHaveBeenCalled();
  });

  it("sends the footprint at the start address once turned on", async () => {
    const { user } = renderControls();
    await waitFor(() => expect(sendCheckbox()).toBeEnabled());

    const startAddress = screen.getByRole("textbox", { name: "Start Address" });
    await user.clear(startAddress);
    await user.type(startAddress, "4{Enter}");
    await user.click(sendCheckbox());

    expect(lastSentFrame()).toHaveLength(512);
    expect(lastSentFrame().slice(0, 7)).toEqual([0, 0, 0, 10, 20, 30, 0]);
  });

  it("sends new levels as they change", async () => {
    const { user, rerender } = renderControls();
    await waitFor(() => expect(sendCheckbox()).toBeEnabled());
    await user.click(sendCheckbox());

    rerender(
      <SacnOutputControls
        documentId={documentId}
        dmxValues={new Uint8Array([99, 98, 97])}
      />,
    );

    expect(lastSentFrame().slice(0, 3)).toEqual([99, 98, 97]);
  });
});

it("warns when the footprint runs past the end of the universe", async () => {
  const { user } = renderControls();

  const startAddress = screen.getByRole("textbox", { name: "Start Address" });
  await user.clear(startAddress);
  await user.type(startAddress, "511{Enter}");

  expect(
    screen.getByText("Sending only 2 of 3 slot(s) due to high start address."),
  ).toBeInTheDocument();
});
