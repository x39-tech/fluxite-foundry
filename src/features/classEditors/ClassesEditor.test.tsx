import { describe, test, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodexId, EntityId } from "app/persistentState";
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

/** Walks the new-class dialog, which every kind shares. */
async function addClass(user: ReturnType<typeof userEvent.setup>, id: string) {
  await user.click(screen.getByRole("button", { name: /^Add / }));

  const dialog = screen.getByRole("dialog");
  const idField = within(dialog).getByRole("textbox", { name: "ID" });
  await user.clear(idField);
  await user.type(idField, `${id}{Enter}`);

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

    await addClass(user, "intensity");

    expect(
      screen.getByRole("button", { name: "intensity" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "ID" })).toHaveValue(
      "intensity",
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      "intensity",
    );
  });

  test("shows each kind its own classes", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity");

    await user.click(screen.getByRole("tab", { name: "Command" }));
    expect(
      screen.queryByRole("button", { name: "intensity" }),
    ).not.toBeInTheDocument();

    await addClass(user, "reset");
    expect(screen.getByRole("button", { name: "reset" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Parameter" }));
    expect(
      screen.getByRole("button", { name: "intensity" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "reset" }),
    ).not.toBeInTheDocument();
  });

  test("each kind keeps its selected class while the user moves between kinds", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity");
    await addClass(user, "pan");
    await user.click(screen.getByRole("button", { name: "intensity" }));

    await user.click(screen.getByRole("tab", { name: "Command" }));
    await user.click(screen.getByRole("tab", { name: "Parameter" }));

    expect(screen.getByRole("textbox", { name: "ID" })).toHaveValue(
      "intensity",
    );
  });

  test("renames a class", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity");

    const nameField = screen.getByRole("textbox", { name: "Name" });
    await user.clear(nameField);
    await user.type(nameField, "Dimmer{Enter}");

    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Dimmer");
  });

  test("deletes a class nothing is using", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity");
    await user.click(
      screen.getByRole("button", { name: "Delete Parameter Class" }),
    );

    expect(
      screen.queryByRole("button", { name: "intensity" }),
    ).not.toBeInTheDocument();
  });

  test("refuses to delete a class a parameter still uses, and says which", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await addClass(user, "intensity");
    referenceFirstParameterClass("dimmer-1");

    await user.click(
      screen.getByRole("button", { name: "Delete Parameter Class" }),
    );

    expect(await screen.findByText(/is in use/)).toBeInTheDocument();
    expect(screen.getByText(/dimmer-1/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "intensity" }),
    ).toBeInTheDocument();
  });

  test("a structure class is never held open, since nothing can reference one", async () => {
    const user = userEvent.setup();
    renderClassesEditor();

    await user.click(screen.getByRole("tab", { name: "Structure" }));
    await addClass(user, "emitters");

    await user.click(
      screen.getByRole("button", { name: "Delete Structure Class" }),
    );

    expect(
      screen.queryByRole("button", { name: "emitters" }),
    ).not.toBeInTheDocument();
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
