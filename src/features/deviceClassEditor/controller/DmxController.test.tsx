/**
 * @jest-environment happy-dom
 */
import { render, screen } from "@testing-library/react";
import { expect, test, vi, beforeEach } from "vitest";
import { DmxController } from "./DmxController";

// Mock the hooks
vi.mock("../dmxEditor/state", () => ({
  useDmxController: vi.fn(),
  useMappableParameters: vi.fn(),
}));

vi.mock("app/store", () => ({
  useDarkMode: vi.fn(() => false),
}));

import { useDmxController, useMappableParameters } from "../dmxEditor/state";

const mockUseMappableParameters = useMappableParameters as ReturnType<
  typeof vi.fn
>;
const mockUseDmxController = useDmxController as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

const noMappingsMessage =
  /Add a DMX parameter mapping in the DMX editor to use the test controller/;

function createMockDriver(paramStates: Array<{ id: string; value: number }>) {
  return {
    getParamStates: vi.fn(() =>
      paramStates.map((p) => ({
        param: { id: p.id },
        value: { type: "numeric" as const, value: p.value },
      })),
    ),
    getDmxValues: vi.fn(() => new Uint8Array(512)),
    updateParamValue: vi.fn(() => ({
      paramStateUpdates: [],
      dmxValues: new Uint8Array(512),
      queuedDmxSequences: [],
    })),
  };
}

test("Renders DMX output display when controller is available with no parameters", () => {
  mockUseMappableParameters.mockReturnValue({});

  const mockDriver = createMockDriver([]);
  mockUseDmxController.mockReturnValue({
    state: "available" as const,
    driver: mockDriver,
    deviceClass: {
      parameters: {},
    },
  });

  render(<DmxController />);

  // Should render the DMX output header
  expect(screen.getByText("DMX Output")).toBeInTheDocument();
});

test("Shows message when DMX controller is not created", () => {
  mockUseMappableParameters.mockReturnValue({});

  mockUseDmxController.mockReturnValue({
    state: "not-created",
  });

  render(<DmxController />);

  expect(screen.getByText(noMappingsMessage)).toBeInTheDocument();
});

test("Shows error message when DMX controller has error", () => {
  mockUseMappableParameters.mockReturnValue({});

  const error = Object.assign(new Error("Test error message (at /foo)"), {
    kind: "Controller",
  });
  mockUseDmxController.mockReturnValue({
    state: "error",
    error,
  });

  render(<DmxController />);

  expect(
    screen.getByText(
      /Error compiling DMX test controller: Test error message \(at \/foo\)/,
    ),
  ).toBeInTheDocument();
});

test("Shows Active Sequences button with count 0 when no sequences are active", () => {
  mockUseMappableParameters.mockReturnValue({});

  const mockDriver = createMockDriver([]);
  mockUseDmxController.mockReturnValue({
    state: "available" as const,
    driver: mockDriver,
    deviceClass: {
      parameters: {},
    },
  });

  render(<DmxController />);

  expect(
    screen.getByRole("button", { name: "Active Sequences: 0" }),
  ).toBeInTheDocument();
});
