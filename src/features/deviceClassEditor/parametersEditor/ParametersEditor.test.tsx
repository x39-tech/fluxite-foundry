import { describe, test, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CodexId,
  documentTypes,
  EntityId,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";
import { useAppPersistentStore } from "app/store";
import { resetAllStores, createEmptyDeviceClassEditor } from "test/utils";
import { updateCurrentEditor } from "../state";
import { ParametersEditor } from "./ParametersEditor";

const CLASS_ID = EntityId("local-parameter-class");
const NAME_KEY = LocalizationKey("local-parameter-class-name");

function createLocalParameterClass() {
  updateCurrentEditor("Add test parameter class", (draft) => {
    draft.localizations[NAME_KEY] = {
      strings: LocalizationDbSchema.parse({ "en-US": "Local Intensity" }),
    };
    draft.parameterClasses[CLASS_ID] = {
      codexId: CodexId("local-intensity"),
      dataType: "number",
      localized: { name: NAME_KEY },
    };
  });
}

function parameters() {
  const state = useAppPersistentStore.getState();
  const document = state.documents[state.session.selectedDocumentId!];
  if (document.type !== documentTypes.DEVICE_CLASS) {
    throw new Error("The open document is not a device class");
  }
  return Object.values(document.parameters);
}

describe("working with a parameters editor", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
  });

  test("Adds a new parameter correctly from the new parameter dialog", async () => {
    const user = userEvent.setup();

    const { getByRole } = render(<ParametersEditor />);

    await user.click(getByRole("button", { name: "Add Parameter" }));

    expect(screen.getByText("New Parameter")).toBeInTheDocument();

    // Edit the ID field
    await user.click(screen.getByDisplayValue("my-new-item"));
    await user.keyboard("{Control>}a{/Control}{Delete}test-item{Enter}");

    // Select a parameter class before adding
    await user.click(screen.getByRole("combobox", { name: "Class" }));
    // Wait for dropdown to open and select any available (non-disabled) parameter class
    const selectableOptions = await screen.findAllByRole("option");
    const enabledClassOptions = selectableOptions.filter(
      (option) =>
        !option.hasAttribute("disabled") &&
        option.textContent &&
        option.textContent.includes("/"), // Parameter classes have format like "category/name"
    );
    if (enabledClassOptions.length > 0) {
      await user.click(enabledClassOptions[0]);
    }

    await user.click(screen.getByRole("button", { name: "Add" }));

    // The new parameter is listed, and selecting it opens its editor
    const listItem = getByRole("button", { name: "test-item" });
    expect(listItem).toBeInTheDocument();
    await user.click(listItem);

    // Verify the ID is displayed correctly
    expect(screen.getByRole("textbox", { name: "ID" })).toHaveValue(
      "test-item",
    );

    // Verify the Display Name field exists but is empty by default
    expect(screen.getByRole("textbox", { name: "Display Name" })).toHaveValue(
      "",
    );
  });
});

describe("creating a parameter against a local class", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    createLocalParameterClass();
  });

  test("offers the device class's own classes and stores a local reference", async () => {
    const user = userEvent.setup();
    render(<ParametersEditor />);

    await user.click(screen.getByRole("button", { name: "Add Parameter" }));

    const dialog = screen.getByRole("dialog");
    const idField = within(dialog).getByRole("textbox", { name: "ID" });
    await user.clear(idField);
    await user.type(idField, "dimmer{Enter}");

    await user.click(within(dialog).getByRole("combobox", { name: "Class" }));

    // The document's own classes are listed under their own heading, ahead of
    // any imported library.
    expect(screen.getByText("This Device Class")).toBeInTheDocument();
    await user.click(
      await screen.findByRole("option", { name: /Local Intensity/ }),
    );

    await user.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(parameters()).toHaveLength(1);
    expect(parameters()[0].codexId).toBe("dimmer");
    expect(parameters()[0].class).toEqual({ type: "local", id: CLASS_ID });
  });

  test("the parameter editor resolves the local class it was given", async () => {
    const user = userEvent.setup();
    render(<ParametersEditor />);

    await user.click(screen.getByRole("button", { name: "Add Parameter" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("combobox", { name: "Class" }));
    await user.click(
      await screen.findByRole("option", { name: /Local Intensity/ }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Add" }));

    await user.click(screen.getByRole("button", { name: "my-new-item" }));

    expect(screen.getByRole("textbox", { name: "Library" })).toHaveValue(
      "Device Library",
    );
    expect(screen.queryByText(/not found/)).not.toBeInTheDocument();
  });
});
