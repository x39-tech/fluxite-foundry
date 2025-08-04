import { getByText, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParametersEditor } from "./ParametersEditor";
import { createDeviceClassEditor } from "features/topNavBar/state";
import { getEditorTableRow } from "test/utils";

beforeEach(() => {
  createDeviceClassEditor();
});

test("Adds a new parameter correctly from the new parameter dialog", async () => {
  const { container, getByRole } = render(<ParametersEditor />);

  await userEvent.click(getByRole("button", { name: "Add Item" }));

  expect(screen.getByText("New Parameter")).toBeInTheDocument();

  // Hm, a bit brittle. Revisit aria-label stuff here if possible
  const user = userEvent.setup();
  await user.click(screen.getByDisplayValue("my-new-item"));
  await user.keyboard("{Control>}a{/Control}{Delete}test-item{Enter}");
  await user.click(screen.getByDisplayValue("My New Item"));
  await user.keyboard("{Control>}a{/Control}{Delete}Test Item{Enter}");

  // Select a parameter class before adding
  await user.click(screen.getByRole("button", { name: "Class" }));
  // Wait for dropdown to open and select any available (non-disabled) parameter class
  const selectableButtons = await screen.findAllByRole("button");
  const enabledClassButtons = selectableButtons.filter(
    (button) =>
      !button.hasAttribute("disabled") &&
      button.textContent &&
      button.textContent.includes("/"), // Parameter classes have format like "category/name"
  );
  if (enabledClassButtons.length > 0) {
    await user.click(enabledClassButtons[0]);
  }

  await user.click(screen.getByRole("button", { name: "Add" }));

  const expandButton = getByRole("button", { name: "Expand Test Item" });
  expect(expandButton).toBeInTheDocument();
  await user.click(expandButton);

  const idRow = getEditorTableRow("ID", container);
  expect(getByText(idRow, "test-item")).toBeInTheDocument();
  const nameRow = getEditorTableRow("Display Name", container);
  expect(getByText(nameRow, "Test Item")).toBeInTheDocument();
});
