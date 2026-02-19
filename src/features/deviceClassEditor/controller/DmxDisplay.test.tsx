import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DmxDisplay } from "./DmxDisplay";
import userEvent from "@testing-library/user-event";

test("Renders empty state when dmxValues has length 0", () => {
  render(<DmxDisplay dmxValues={new Uint8Array(0)} />);

  expect(screen.getByText("DMX Output")).toBeInTheDocument();
  expect(screen.getByText("No DMX slots to display")).toBeInTheDocument();
});

test("Renders single slot correctly", () => {
  const dmxValues = new Uint8Array([255]);
  render(<DmxDisplay dmxValues={dmxValues} />);

  expect(screen.getByText("DMX Output")).toBeInTheDocument();
  // In hex format by default
  expect(screen.getByText("ff")).toBeInTheDocument();
});

test("Renders 8 slots in a single row", () => {
  const dmxValues = new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17]);
  render(<DmxDisplay dmxValues={dmxValues} />);

  // Check all values are present in hex format (a through 11)
  expect(screen.getByText("a")).toBeInTheDocument(); // 10
  expect(screen.getByText("b")).toBeInTheDocument(); // 11
  expect(screen.getByText("c")).toBeInTheDocument(); // 12
  expect(screen.getByText("d")).toBeInTheDocument(); // 13
  expect(screen.getByText("e")).toBeInTheDocument(); // 14
  expect(screen.getByText("f")).toBeInTheDocument(); // 15
  expect(screen.getByText("10")).toBeInTheDocument(); // 16
  expect(screen.getByText("11")).toBeInTheDocument(); // 17
});

test("Renders 9 slots across two rows", () => {
  const dmxValues = new Uint8Array([10, 11, 12, 13, 14, 15, 16, 17, 18]);
  render(<DmxDisplay dmxValues={dmxValues} />);

  // All values should be present in hex format
  expect(screen.getByText("a")).toBeInTheDocument(); // 10
  expect(screen.getByText("12")).toBeInTheDocument(); // 18
});

test("Renders exactly 512 slots (64 rows of 8) without error", () => {
  const dmxValues = new Uint8Array(512);
  // Set some distinctive values that won't collide with row labels
  dmxValues[0] = 171; // 0xab
  dmxValues[511] = 205; // 0xcd

  render(<DmxDisplay dmxValues={dmxValues} />);

  expect(screen.getByText("DMX Output")).toBeInTheDocument();
  expect(screen.getByText("ab")).toBeInTheDocument(); // first slot
  expect(screen.getByText("cd")).toBeInTheDocument(); // last slot
});

test("Switches between hex and decimal display formats", async () => {
  const user = userEvent.setup();
  const dmxValues = new Uint8Array([171]); // 0xab
  render(<DmxDisplay dmxValues={dmxValues} />);

  // Initially in hex format
  expect(screen.getByText("ab")).toBeInTheDocument();

  // Switch to decimal
  await user.click(screen.getByRole("combobox"));
  await user.click(screen.getByText("decimal"));

  // Should now show decimal value
  expect(screen.getByText("171")).toBeInTheDocument();
  expect(screen.queryByText("ab")).not.toBeInTheDocument();
});

test("Renders 16 slots (2 rows) correctly", () => {
  const dmxValues = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    dmxValues[i] = i + 10;
  }

  render(<DmxDisplay dmxValues={dmxValues} />);

  // Check first and last values are present
  expect(screen.getByText("a")).toBeInTheDocument(); // 10
  expect(screen.getByText("19")).toBeInTheDocument(); // 25
});

test("Renders partial last row correctly (13 slots)", () => {
  const dmxValues = new Uint8Array(13);
  dmxValues[12] = 100;

  render(<DmxDisplay dmxValues={dmxValues} />);

  // Last value should be rendered
  expect(screen.getByText("64")).toBeInTheDocument(); // 100 in hex
});

test("Marks active slots as sequence-controlled", () => {
  const dmxValues = new Uint8Array([10, 20, 30, 40]);
  const activeSlots = new Set([1, 3]); // Slots at index 1 and 3 are active

  render(<DmxDisplay dmxValues={dmxValues} activeSlots={activeSlots} />);

  const slot0 = screen.getByText("a"); // 10 in hex
  const slot1 = screen.getByText("14"); // 20 in hex
  const slot2 = screen.getByText("1e"); // 30 in hex
  const slot3 = screen.getByText("28"); // 40 in hex

  // Active slots announce their sequence-controlled status
  expect(slot1).toHaveAccessibleName("14 (sequence)");
  expect(slot3).toHaveAccessibleName("28 (sequence)");

  // Inactive slots have no sequence indicator
  expect(slot0).not.toHaveAccessibleName(/sequence/);
  expect(slot2).not.toHaveAccessibleName(/sequence/);
});

test("Renders without highlighting when activeSlots is undefined", () => {
  const dmxValues = new Uint8Array([10, 20]);

  render(<DmxDisplay dmxValues={dmxValues} />);

  const slot0 = screen.getByText("a"); // 10 in hex
  const slot1 = screen.getByText("14"); // 20 in hex

  expect(slot0).not.toHaveAccessibleName(/sequence/);
  expect(slot1).not.toHaveAccessibleName(/sequence/);
});

test("Renders without highlighting when activeSlots is empty", () => {
  const dmxValues = new Uint8Array([10, 20]);
  const activeSlots = new Set<number>();

  render(<DmxDisplay dmxValues={dmxValues} activeSlots={activeSlots} />);

  const slot0 = screen.getByText("a"); // 10 in hex
  const slot1 = screen.getByText("14"); // 20 in hex

  expect(slot0).not.toHaveAccessibleName(/sequence/);
  expect(slot1).not.toHaveAccessibleName(/sequence/);
});
