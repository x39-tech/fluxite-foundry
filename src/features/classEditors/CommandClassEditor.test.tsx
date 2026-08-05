import { describe, test, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CodexId,
  EntityId,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";
import { resetAllStores, createEmptyDeviceClassEditor } from "test/utils";
import { updateCurrentEditor } from "features/deviceClassEditor/state";
import { DeviceClassClassEditing } from "features/deviceClassEditor/classEditing";
import { CommandClassEditor } from "./CommandClassEditor";

const CLASS_ID = EntityId("test-command-class");
const NAME_KEY = LocalizationKey("test-command-class-name");

function createTestCommandClass() {
  updateCurrentEditor("Add test command class", (draft) => {
    draft.localizations[NAME_KEY] = {
      strings: LocalizationDbSchema.parse({ "en-US": "Reset" }),
    };
    draft.commandClasses[CLASS_ID] = {
      codexId: CodexId("reset"),
      localized: { name: NAME_KEY },
    };
  });
}

function renderEditor() {
  return render(
    <DeviceClassClassEditing>
      <CommandClassEditor id={CLASS_ID} />
    </DeviceClassClassEditing>,
  );
}

// Arguments and return values are laid out identically, so each section is
// reached through the group its label names.
function section(name: "Arguments" | "Return Values"): HTMLElement {
  return screen.getByText(name).parentElement!;
}

describe("CommandClassEditor", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    createTestCommandClass();
  });

  test("starts with no arguments and no return values", () => {
    renderEditor();

    expect(
      within(section("Arguments")).getByRole("button", {
        name: "Add Argument",
      }),
    ).toBeInTheDocument();
    expect(
      within(section("Arguments")).queryByRole("textbox", { name: "ID" }),
    ).not.toBeInTheDocument();
  });

  test("adds an argument and renames it", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      within(section("Arguments")).getByRole("button", {
        name: "Add Argument",
      }),
    );

    const argument = within(section("Arguments"));
    expect(argument.getByRole("textbox", { name: "ID" })).toHaveValue(
      "new-argument",
    );
    expect(argument.getByRole("textbox", { name: "Name" })).toHaveValue(
      "New Argument",
    );

    const idField = argument.getByRole("textbox", { name: "ID" });
    await user.clear(idField);
    await user.type(idField, "scope{Enter}");

    expect(
      within(section("Arguments")).getByRole("textbox", { name: "ID" }),
    ).toHaveValue("scope");
  });

  test("keeps arguments and return values apart", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      within(section("Arguments")).getByRole("button", {
        name: "Add Argument",
      }),
    );
    await user.click(
      within(section("Return Values")).getByRole("button", {
        name: "Add Return Value",
      }),
    );

    expect(
      within(section("Arguments")).getByRole("textbox", { name: "Name" }),
    ).toHaveValue("New Argument");
    expect(
      within(section("Return Values")).getByRole("textbox", { name: "Name" }),
    ).toHaveValue("New Return Value");
  });

  test("marks an argument required", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      within(section("Arguments")).getByRole("button", {
        name: "Add Argument",
      }),
    );

    const required = within(section("Arguments")).getByRole("checkbox", {
      name: "Required",
    });
    expect(required).not.toBeChecked();

    await user.click(required);

    expect(
      within(section("Arguments")).getByRole("checkbox", { name: "Required" }),
    ).toBeChecked();
  });

  test("deletes an argument", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(
      within(section("Arguments")).getByRole("button", {
        name: "Add Argument",
      }),
    );
    await user.click(
      within(section("Arguments")).getByRole("button", {
        name: "Delete Argument new-argument",
      }),
    );

    expect(
      within(section("Arguments")).queryByRole("textbox", { name: "ID" }),
    ).not.toBeInTheDocument();
  });
});
