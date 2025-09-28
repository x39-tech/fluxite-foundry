/**
 * @jest-environment happy-dom
 */
import { render, screen } from "@testing-library/react";
import { expect, test, vi, beforeEach } from "vitest";
import { DmxController } from "./DmxController";

// Mock the hooks
vi.mock("../state", () => ({
  useParametersWithClasses: vi.fn(),
}));

vi.mock("../dmxEditor/state", () => ({
  useDmxController: vi.fn(),
}));

vi.mock("app/store", () => ({
  useDarkMode: vi.fn(() => false),
}));

import { useParametersWithClasses } from "../state";
import { useDmxController } from "../dmxEditor/state";

const mockUseParametersWithClasses = useParametersWithClasses as ReturnType<
  typeof vi.fn
>;
const mockUseDmxController = useDmxController as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

const noMappingsMessage =
  /Add a DMX parameter mapping in the DMX editor to use the test controller/;

test("Correctly handles case where reconcileParamValues results in empty state", () => {
  // Mock empty parameter classes
  mockUseParametersWithClasses.mockReturnValue({});

  // Create dmx controller with no parameters or clusters,
  // which will result in empty param values after initialization
  const dmxController = {
    state: "available" as const,
    db: {
      parameters: {},
      dmx_driver: {
        chunks: {},
        clusters: [],
      },
    },
  };

  mockUseDmxController.mockReturnValue(dmxController);

  render(<DmxController />);

  expect(screen.getByText(noMappingsMessage)).toBeInTheDocument();
});

test("Shows message when no DMX driver is present", () => {
  mockUseParametersWithClasses.mockReturnValue({});

  mockUseDmxController.mockReturnValue({
    state: "available",
    db: {
      parameters: {},
      dmx_driver: null,
    },
  });

  render(<DmxController />);

  expect(screen.getByText(noMappingsMessage)).toBeInTheDocument();
});

test("Shows message when DMX controller is not created", () => {
  mockUseParametersWithClasses.mockReturnValue({});

  mockUseDmxController.mockReturnValue({
    state: "not-created",
  });

  render(<DmxController />);

  expect(screen.getByText(noMappingsMessage)).toBeInTheDocument();
});

test("Shows error message when DMX controller has error", () => {
  mockUseParametersWithClasses.mockReturnValue({});

  mockUseDmxController.mockReturnValue({
    state: "error",
    error: {
      type: "compilation_error",
      description: "Test error message",
    },
  });

  render(<DmxController />);

  expect(
    screen.getByText(
      /Error compiling DMX test controller: compilation_error: Test error message/,
    ),
  ).toBeInTheDocument();
});
