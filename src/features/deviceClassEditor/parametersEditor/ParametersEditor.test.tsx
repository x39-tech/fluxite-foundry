import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParametersEditor } from "./ParametersEditor";
import { createDeviceClassEditor } from "features/topNavBar/state";

beforeEach(() => {
  createDeviceClassEditor();
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
  expect(screen.getByRole("textbox", { name: "ID" })).toHaveValue("test-item");

  // Verify the Display Name field exists but is empty by default
  expect(screen.getByRole("textbox", { name: "Display Name" })).toHaveValue("");
});
