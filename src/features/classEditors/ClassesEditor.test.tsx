import { describe, test, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodexId, EntityId } from "app/persistentState";
import { splitParameterClassId } from "codex/categories";
import { resetAllStores, createEmptyDeviceClassEditor } from "test/utils";
import { updateCurrentEditor } from "features/deviceClassEditor/state";
import { DeviceClassClassEditing } from "features/deviceClassEditor/classEditing";
import { Toaster } from "components/scn-ui/Sonner";
import { ClassesEditor } from "./ClassesEditor";

// The Toaster goes along, since refusing to delete a class is reported in one.
function renderClassesEditor() {
  return render(
    <DeviceClassClassEditing>
      <ClassesEditor />
      <Toaster />
    </DeviceClassClassEditing>,
  );
}

// Look up the row for a parameter class given its full CodexId
const rowNameFor =
  (codexId: string) =>
  (name: string): boolean => {
    const { identifier } = splitParameterClassId(codexId);
    return name === identifier || name.startsWith(`${identifier} `);
  };

function getClassRow(codexId: string) {
  return screen.getByRole("button", { name: rowNameFor(codexId) });
}

function queryClassRow(codexId: string) {
  return screen.queryByRole("button", { name: rowNameFor(codexId) });
}

/** Picks a category in the open picker by its identifier. */
async function chooseCategory(
  user: ReturnType<typeof userEvent.setup>,
  category: string,
) {
  await user.click(screen.getByRole("combobox", { name: "Category" }));
  await user.type(
    screen.getByPlaceholderText("Search categories..."),
    category,
  );

  const options = await screen.findAllByRole("option");
  const option = options.find((candidate) =>
    within(candidate).queryByText(category, { exact: true }),
  );
  if (!option) {
    throw new Error(`The category ${category} was not offered`);
  }

  await user.click(option);
}

/**
 * Walks the new-class dialog, which is shared by every kind of class. A
 * parameter class is special - it is made up of a category and an identifier
 * together, so an ID with a category in it is entered in the two fields it
 * belongs to.
 */
async function addClass(
  user: ReturnType<typeof userEvent.setup>,
  codexId: string,
) {
  await user.click(screen.getByRole("button", { name: /^Add / }));

  const dialog = screen.getByRole("dialog");
  const { category, identifier } = splitParameterClassId(codexId);

  if (category) {
    await chooseCategory(user, category);
  }

  const idField = within(dialog).getByRole("textbox", { name: "ID" });
  await user.clear(idField);
  await user.type(idField, `${identifier}{Enter}`);

  await user.click(within(dialog).getByRole("button", { name: "Add" }));
}

describe("ClassesEditor", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
  });

  test("adds a parameter class and opens its editor", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity/dimmer");

    expect(getClassRow("intensity/dimmer")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "ID" })).toHaveValue("dimmer");
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("dimmer");
  });

  test("lists a parameter class by its identifier, with its category under it", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "color/cie-1931/xy/x");

    const row = getClassRow("color/cie-1931/xy/x");
    expect(row).toHaveTextContent("x");
    expect(row).toHaveTextContent("Color › CIE-1931 › CIE XY");
    expect(row).not.toHaveTextContent("color/cie-1931/xy");
  });

  test("finds a parameter class by the whole ID a reference to it holds", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity/dimmer");
    await addClass(user, "color/additive/emitter");

    await user.type(
      screen.getByRole("searchbox", { name: /Search/ }),
      "color/additive",
    );

    expect(getClassRow("color/additive/emitter")).toBeInTheDocument();
    expect(queryClassRow("intensity/dimmer")).not.toBeInTheDocument();
  });

  test("finds a parameter class by the name of its category", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity/dimmer");
    await addClass(user, "color/additive/emitter");

    await user.type(
      screen.getByRole("searchbox", { name: /Search/ }),
      "additive",
    );

    expect(getClassRow("color/additive/emitter")).toBeInTheDocument();
    expect(queryClassRow("intensity/dimmer")).not.toBeInTheDocument();
  });

  test("will not add a parameter class until it has a category", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await user.click(screen.getByRole("button", { name: /^Add / }));
    const dialog = screen.getByRole("dialog");

    // Every parameter class must be assigned a category per the standard, so an
    // ID on its own is not enough to make one.
    expect(within(dialog).getByRole("button", { name: "Add" })).toBeDisabled();

    await chooseCategory(user, "intensity");
    expect(within(dialog).getByRole("button", { name: "Add" })).toBeEnabled();
  });

  test("adds a class of a kind that has no category", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    // Only parameter classes are categorized, so the other kinds just use an
    // identifier and offer no category field.
    await user.click(screen.getByRole("tab", { name: "Command" }));
    await user.click(screen.getByRole("button", { name: /^Add / }));

    expect(
      within(screen.getByRole("dialog")).queryByRole("combobox", {
        name: "Category",
      }),
    ).not.toBeInTheDocument();
  });

  test("shows each kind its own classes", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity/dimmer");

    await user.click(screen.getByRole("tab", { name: "Command" }));
    expect(queryClassRow("intensity/dimmer")).not.toBeInTheDocument();

    await addClass(user, "reset");
    expect(getClassRow("reset")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Parameter" }));
    expect(getClassRow("intensity/dimmer")).toBeInTheDocument();
    expect(queryClassRow("reset")).not.toBeInTheDocument();
  });

  test("each kind keeps its selected class while the user moves between kinds", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity/dimmer");
    await addClass(user, "motion/pan");
    await user.click(getClassRow("intensity/dimmer"));

    await user.click(screen.getByRole("tab", { name: "Command" }));
    await user.click(screen.getByRole("tab", { name: "Parameter" }));

    expect(screen.getByRole("textbox", { name: "ID" })).toHaveValue("dimmer");
  });

  test("renames a class", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity/dimmer");

    const nameField = screen.getByRole("textbox", { name: "Name" });
    await user.clear(nameField);
    await user.type(nameField, "Dimmer{Enter}");

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Dimmer");
  });

  test("deletes a class nothing is using", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity/dimmer");
    await user.click(
      screen.getByRole("button", { name: "Delete Parameter Class" }),
    );

    expect(queryClassRow("intensity/dimmer")).not.toBeInTheDocument();
  });

  test("refuses to delete a class a parameter still uses, and says which", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity/dimmer");
    referenceFirstParameterClass("dimmer-1");

    await user.click(
      screen.getByRole("button", { name: "Delete Parameter Class" }),
    );

    expect(await screen.findByText(/is in use/)).toBeInTheDocument();
    expect(screen.getByText(/dimmer-1/)).toBeInTheDocument();
    expect(getClassRow("intensity/dimmer")).toBeInTheDocument();
  });

  test("a structure class is never held open, since nothing can reference one", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await user.click(screen.getByRole("tab", { name: "Structure" }));
    await addClass(user, "emitters");

    await user.click(
      screen.getByRole("button", { name: "Delete Structure Class" }),
    );

    expect(queryClassRow("emitters")).not.toBeInTheDocument();
  });
});

// Points a parameter at whichever parameter class the document has, the way
// the New Parameter dialog would.
function referenceFirstParameterClass(paramCodexId: string) {
  updateCurrentEditor("Add test parameter", (draft) => {
    const classId = EntityId(Object.keys(draft.parameterClasses)[0]);
    const paramId = EntityId("test-parameter");

    draft.parameters[paramId] = {
      codexId: CodexId(paramCodexId),
      class: { type: "local", id: classId },
      access: ["readActual"],
      lifetime: "runtime",
      localized: {},
    };
    draft.parameterEditors.push(paramId);
  });
}
