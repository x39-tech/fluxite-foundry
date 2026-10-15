/**
 * @jest-environment happy-dom
 */
import { render, screen, within } from "test/render";
import userEvent from "@testing-library/user-event";
import { expect, test, vi, beforeEach } from "vitest";
import { DriverParamValue } from "@cpwg-community/delver";
import {
  CodexId,
  EntityId,
  FCDataType,
  fcDataTypes,
  LocalizationKey,
  Parameter,
} from "app/persistentState";
import { updateAppPersistentState } from "app/store";
import { resetAllStores } from "test/utils";
import { MappableParameter } from "../dmxEditor/state";
import { DmxController } from "./DmxController";

vi.mock("../dmxEditor/state", () => ({
  useDmxController: vi.fn(),
  useMappableParameters: vi.fn(),
}));

vi.mock("../effects", () => ({
  resetDmxDriver: vi.fn(),
}));

import { useDmxController, useMappableParameters } from "../dmxEditor/state";
import { resetDmxDriver } from "../effects";

const DOCUMENT_ID = EntityId("doc");

beforeEach(() => {
  vi.clearAllMocks();
  resetAllStores();
  updateAppPersistentState((state) => {
    state.session.selectedDocumentId = DOCUMENT_ID;
  });
});

interface TestParam {
  id: string;
  classId: string;
  dataType: FCDataType;
  value: DriverParamValue;
  name?: string;
  description?: string;
  param?: Partial<Parameter>;
  choices?: string[];
}

function mappable(p: TestParam): MappableParameter {
  return {
    entityId: EntityId(p.id),
    friendlyName: p.name,
    param: {
      codexId: CodexId(p.id),
      class: { type: "imported", codexId: CodexId(p.classId) },
      access: ["write"],
      lifetime: "runtime",
      localized: {},
      ...p.param,
    } as Parameter,
    paramClass: {
      codexId: CodexId(p.classId),
      dataType: p.dataType as MappableParameter["paramClass"]["dataType"],
      name: { value: p.classId },
      description: p.description ? { value: p.description } : undefined,
      choices: [],
      localized: { name: LocalizationKey("unused") },
    } as unknown as MappableParameter["paramClass"],
    enumChoices: (p.choices ?? []).map((name, index) => ({
      index,
      codexId: CodexId(name.toLowerCase()),
      name: { value: name, locale: "en-US", desiredLocale: "en-US" },
    })),
  };
}

function setUpController(params: TestParam[]) {
  vi.mocked(useMappableParameters).mockReturnValue(
    Object.fromEntries(params.map((p) => [EntityId(p.id), mappable(p)])),
  );

  const driver = {
    getParamStates: vi.fn(() =>
      params.map((p) => ({ param: { id: p.id }, value: p.value })),
    ),
    getDmxValues: vi.fn(() => new Uint8Array(8)),
    updateParamValue: vi.fn(
      (id: string, _index: number | null, value: DriverParamValue) => ({
        paramStateUpdates: [{ param: { id }, value }],
        dmxValues: new Uint8Array(8),
        queuedDmxSequences: [],
      }),
    ),
  };
  vi.mocked(useDmxController).mockReturnValue({
    state: "available",
    driver: driver as never,
  });

  render(<DmxController />);
  return { driver, user: userEvent.setup() };
}

const PAN: TestParam = {
  id: "pan",
  name: "Pan",
  classId: "motion/rotate/pan",
  dataType: fcDataTypes.NUMBER,
  value: { type: "numeric", value: 0 },
  description: "Rotation about the vertical axis",
  param: { minimum: -270, maximum: 270, default: 0 },
};

const SHUTTER: TestParam = {
  id: "shutter",
  name: "Shutter",
  classId: "intensity/shutter",
  dataType: fcDataTypes.BOOLEAN,
  value: { type: "bool", value: false },
};

const FAN_MODE: TestParam = {
  id: "fan-mode",
  name: "Fan Mode",
  classId: "fan-mode",
  dataType: fcDataTypes.ENUM,
  value: { type: "enum", value: 0 },
  choices: ["Off", "Low", "High"],
};

test("Shows message when DMX controller is not created", () => {
  vi.mocked(useMappableParameters).mockReturnValue({});
  vi.mocked(useDmxController).mockReturnValue({ state: "not-created" });

  render(<DmxController />);

  expect(
    screen.getByText(
      /Add a DMX parameter mapping in the DMX editor to use the test controller/,
    ),
  ).toBeInTheDocument();
});

test("Shows error message when DMX controller has error", () => {
  vi.mocked(useMappableParameters).mockReturnValue({});
  const error = Object.assign(new Error("Test error message (at /foo)"), {
    kind: "Controller",
  });
  vi.mocked(useDmxController).mockReturnValue({
    state: "error",
    error: error as never,
  });

  render(<DmxController />);

  expect(
    screen.getByText(
      /Error compiling DMX test controller: Test error message \(at \/foo\)/,
    ),
  ).toBeInTheDocument();
});

test("Shows the DMX output, parameters and active sequences", () => {
  setUpController([]);

  expect(
    screen.getByRole("region", { name: "DMX Output" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("region", { name: "Parameters" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Active Sequences: 0" }),
  ).toBeInTheDocument();
});

test("Does not offer sACN output in the browser", () => {
  setUpController([]);

  expect(screen.queryByLabelText("Send sACN")).not.toBeInTheDocument();
});

test("Gives each kind of parameter its own control", () => {
  setUpController([PAN, SHUTTER, FAN_MODE]);

  expect(screen.getByRole("slider", { name: "Pan" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Pan" })).toHaveValue("0");
  expect(screen.getByRole("switch", { name: "Shutter" })).not.toBeChecked();
  expect(screen.getByRole("combobox", { name: "Fan Mode" })).toHaveTextContent(
    "Off",
  );
});

test("Labels a parameter with its codexId when it has no name", () => {
  setUpController([{ ...PAN, name: undefined }]);

  expect(screen.getByRole("slider", { name: "pan" })).toBeInTheDocument();
});

test("Shows a number box with no slider when a number has no range", () => {
  setUpController([{ ...PAN, param: {} }]);

  expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Pan" })).toBeInTheDocument();
});

test("Sends a typed number, decimals included, to the driver", async () => {
  const { driver, user } = setUpController([PAN]);
  const input = screen.getByRole("textbox", { name: "Pan" });

  await user.clear(input);
  await user.type(input, "12.5{Enter}");

  expect(driver.updateParamValue).toHaveBeenCalledWith("pan", null, {
    type: "numeric",
    value: 12.5,
  });
  expect(input).toHaveValue("12.5");
});

test("Keeps a typed number within the parameter's range", async () => {
  const { driver, user } = setUpController([PAN]);
  const input = screen.getByRole("textbox", { name: "Pan" });

  await user.clear(input);
  await user.type(input, "1000{Enter}");

  expect(driver.updateParamValue).toHaveBeenCalledWith("pan", null, {
    type: "numeric",
    value: 270,
  });
});

test("Sends booleans and enum choices as their own types", async () => {
  const { driver, user } = setUpController([SHUTTER, FAN_MODE]);

  await user.click(screen.getByRole("switch", { name: "Shutter" }));
  expect(driver.updateParamValue).toHaveBeenCalledWith("shutter", null, {
    type: "bool",
    value: true,
  });
  expect(screen.getByRole("switch", { name: "Shutter" })).toBeChecked();

  await user.click(screen.getByRole("combobox", { name: "Fan Mode" }));
  await user.click(screen.getByRole("option", { name: "High" }));
  expect(driver.updateParamValue).toHaveBeenCalledWith("fan-mode", null, {
    type: "enum",
    value: 2,
  });
});

test("Resets a parameter to the value the driver started it at", async () => {
  const { driver, user } = setUpController([
    { ...PAN, value: { type: "numeric", value: 45 } },
  ]);
  const input = screen.getByRole("textbox", { name: "Pan" });
  await user.clear(input);
  await user.type(input, "90{Enter}");

  await user.click(screen.getByRole("button", { name: "Reset to Default" }));

  expect(driver.updateParamValue).toHaveBeenLastCalledWith("pan", null, {
    type: "numeric",
    value: 45,
  });
  expect(input).toHaveValue("45");
});

test("Resets a parameter the driver started with no value to its default", async () => {
  const { driver, user } = setUpController([
    { ...PAN, value: { type: "null" }, param: { ...PAN.param, default: 10 } },
  ]);

  await user.click(screen.getByRole("button", { name: "Reset to Default" }));

  expect(driver.updateParamValue).toHaveBeenCalledWith("pan", null, {
    type: "numeric",
    value: 10,
  });
});

test("Cannot reset a parameter with nothing to reset to", () => {
  setUpController([{ ...SHUTTER, value: { type: "null" } }]);

  expect(
    screen.getByRole("button", { name: "Reset to Default" }),
  ).toBeDisabled();
});

test("Resets every parameter by rebuilding the driver", async () => {
  const { user } = setUpController([PAN]);

  await user.click(
    screen.getByRole("button", { name: "Reset Values to Defaults" }),
  );

  expect(resetDmxDriver).toHaveBeenCalledWith(DOCUMENT_ID);
});

test("Filters parameters by top-level category", async () => {
  const { user } = setUpController([
    PAN,
    SHUTTER,
    FAN_MODE,
    {
      ...PAN,
      id: "tilt",
      name: "Tilt",
      classId: "motion/rotate/tilt",
    },
  ]);
  const categories = screen.getByRole("radiogroup", { name: "Categories" });
  const chipNames = within(categories)
    .getAllByRole("radio")
    .map((chip) => chip.textContent);

  expect(chipNames[0]).toBe("All");
  expect(chipNames).toHaveLength(4);
  expect(chipNames[3]).toBe("Other");

  const motion = within(categories).getAllByRole("radio")[2];
  await user.click(motion);

  expect(motion).toBeChecked();
  expect(screen.getByRole("slider", { name: "Pan" })).toBeInTheDocument();
  expect(screen.getByRole("slider", { name: "Tilt" })).toBeInTheDocument();
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

  await user.click(within(categories).getByRole("radio", { name: "Other" }));

  expect(
    screen.getByRole("combobox", { name: "Fan Mode" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("slider")).not.toBeInTheDocument();
});

test("Searches parameters by name and codexId", async () => {
  const { user } = setUpController([PAN, SHUTTER, FAN_MODE]);
  const search = screen.getByRole("searchbox", { name: "Search Parameters" });

  await user.type(search, "shut");
  expect(screen.getByRole("switch", { name: "Shutter" })).toBeInTheDocument();
  expect(screen.queryByRole("slider")).not.toBeInTheDocument();

  await user.clear(search);
  await user.type(search, "fan-");
  expect(
    screen.getByRole("combobox", { name: "Fan Mode" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
});

test("Shows one row for each instance of a parameter", () => {
  setUpController([
    {
      ...PAN,
      id: "frame",
      name: "Frame",
      param: { ...PAN.param, count: { type: "fixed", value: 2 } },
    },
  ]);

  expect(screen.getByRole("slider", { name: "Frame [0]" })).toBeInTheDocument();
  expect(screen.getByRole("slider", { name: "Frame [1]" })).toBeInTheDocument();
});

test("Switches the layout between horizontal and vertical", async () => {
  const { user } = setUpController([]);

  await user.click(screen.getByRole("button", { name: "Split Horizontal" }));

  expect(
    screen.getByRole("button", { name: "Split Vertical" }),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Split Vertical" }));

  expect(
    screen.getByRole("button", { name: "Split Horizontal" }),
  ).toBeInTheDocument();
});
