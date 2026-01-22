import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeviceInfoEditor } from "./DeviceInfoEditor";
import { createDeviceClassEditor } from "features/topNavBar/state";
import { expect } from "vitest";
import { modelCategories, ModelCategory } from "app/persistentState";
import { useAppPersistentStore } from "app/store";

// Helper function to change a ValidatedInput field value
async function changeConfirmableInputField(
  user: ReturnType<typeof userEvent.setup>,
  inputElement: HTMLElement,
  newValue: string,
) {
  await user.clear(inputElement);
  await user.type(inputElement, newValue);
  await user.keyboard("{Enter}");

  // Wait for the input to have the new value after confirmation
  await waitFor(() => {
    expect(inputElement).toHaveValue(newValue);
  });
}

beforeEach(() => {
  createDeviceClassEditor();
});

test("renders all manufacturer information fields", () => {
  render(<DeviceInfoEditor />);

  expect(screen.getByText("Manufacturer Information")).toBeInTheDocument();
  expect(screen.getByLabelText("Manufacturer Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Manufacturer URL")).toBeInTheDocument();
  expect(screen.getByLabelText("Manufacturer ESTA ID")).toBeInTheDocument();
});

test("renders all model information fields", () => {
  render(<DeviceInfoEditor />);

  expect(screen.getByText("Model Information")).toBeInTheDocument();
  expect(screen.getByLabelText("Model Name")).toBeInTheDocument();
  expect(screen.getByLabelText("Category")).toBeInTheDocument();
  expect(screen.getByLabelText("Subcategory")).toBeInTheDocument();
});

test("renders compatibility section", () => {
  render(<DeviceInfoEditor />);

  expect(screen.getByText("Compatibility")).toBeInTheDocument();
  expect(screen.getByLabelText("Firmware Versions")).toBeInTheDocument();
});

test("renders device class information section", () => {
  render(<DeviceInfoEditor />);

  expect(screen.getByText("Device Class Information")).toBeInTheDocument();
  expect(screen.getByLabelText("Description")).toBeInTheDocument();
  expect(screen.getByLabelText("Author")).toBeInTheDocument();
  expect(screen.getByLabelText("Publish Date")).toBeInTheDocument();
});

test("category field has valid options", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const categorySelect = screen.getByLabelText("Category");
  expect(categorySelect).toBeInTheDocument();

  // Focus and use keyboard to open the dropdown (more reliable in tests)
  categorySelect.focus();
  await user.keyboard("{ArrowDown}");

  // Find all options (they appear as listbox options when opened)
  const options = await screen.findAllByRole("option");
  expect(options.length).toBeGreaterThan(0);

  // Verify at least one valid category is available
  const categoryValues = Object.values(modelCategories);
  const hasValidCategory = options.some((option) =>
    categoryValues.includes(option.textContent as ModelCategory),
  );
  expect(hasValidCategory).toBe(true);
});

test("subcategory field has options", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const subcategorySelect = screen.getByLabelText("Subcategory");
  expect(subcategorySelect).toBeInTheDocument();

  // Focus and use keyboard to open the dropdown
  subcategorySelect.focus();
  await user.keyboard("{ArrowDown}");

  // Find all options (they appear as listbox options when opened)
  const options = await screen.findAllByRole("option");
  expect(options.length).toBeGreaterThan(0);

  // Verify that there's a current value displayed
  expect(subcategorySelect.textContent).toBeTruthy();
});

test("can change manufacturer name field", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const input = screen.getByLabelText("Manufacturer Name");
  expect(input).toBeInTheDocument();

  await changeConfirmableInputField(user, input, "New Manufacturer Name");
});

test("can change model name field", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const input = screen.getByLabelText("Model Name");
  expect(input).toBeInTheDocument();

  await changeConfirmableInputField(user, input, "New Model Name");
});

test("can change category field", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const categorySelect = screen.getByLabelText("Category");
  expect(categorySelect).toBeInTheDocument();

  const initialValue = categorySelect.textContent;

  // Focus and use keyboard to open the dropdown
  categorySelect.focus();
  await user.keyboard("{ArrowDown}");

  // Find all options
  const options = await screen.findAllByRole("option");
  expect(options.length).toBeGreaterThan(1); // Ensure there are multiple options

  // Use keyboard to navigate and select a different option
  await user.keyboard("{ArrowDown}{Enter}");

  await waitFor(() => {
    // Just verify that the value changed from the initial value
    expect(categorySelect.textContent).not.toBe(initialValue);
    // And verify it's not empty
    expect(categorySelect.textContent).toBeTruthy();
  });
});

test("can change subcategory field", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const subcategorySelect = screen.getByLabelText("Subcategory");
  expect(subcategorySelect).toBeInTheDocument();

  const initialValue = subcategorySelect.textContent;

  // Focus and use keyboard to open the dropdown
  subcategorySelect.focus();
  await user.keyboard("{ArrowDown}");

  // Find all options
  const options = await screen.findAllByRole("option");
  expect(options.length).toBeGreaterThan(1); // Ensure there are multiple options

  // Use keyboard to navigate and select a different option
  await user.keyboard("{ArrowDown}{Enter}");

  await waitFor(() => {
    // Just verify that the value changed from the initial value
    expect(subcategorySelect.textContent).not.toBe(initialValue);
    // And verify it's not empty
    expect(subcategorySelect.textContent).toBeTruthy();
  });
});

test("can change description field", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const input = screen.getByLabelText("Description");
  expect(input).toBeInTheDocument();

  await changeConfirmableInputField(user, input, "New Device Description");
});

test("can change author field", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const input = screen.getByLabelText("Author");
  expect(input).toBeInTheDocument();

  await changeConfirmableInputField(user, input, "New Author Name");
});

test("can change publish date field", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const input = screen.getByLabelText("Publish Date");
  expect(input).toBeInTheDocument();

  await changeConfirmableInputField(user, input, "New Publish Date");
});

test("can change manufacturer URL field", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const input = screen.getByLabelText("Manufacturer URL");
  expect(input).toBeInTheDocument();

  await changeConfirmableInputField(user, input, "https://example.com");
});

test("can change manufacturer ESTA ID field", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const input = screen.getByLabelText("Manufacturer ESTA ID");
  expect(input).toBeInTheDocument();

  await changeConfirmableInputField(user, input, "12345");
});

test("can add firmware versions using tag input", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const input = screen.getByLabelText("Firmware Versions");
  expect(input).toBeInTheDocument();

  await user.type(input, "v1.0.0");
  await user.keyboard("{Enter}");

  expect(screen.getByText("v1.0.0")).toBeInTheDocument();
});

test("can add multiple firmware versions", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const input = screen.getByLabelText("Firmware Versions");
  expect(input).toBeInTheDocument();

  // Add first version
  await user.type(input, "v1.0.0");
  await user.keyboard("{Enter}");

  // Add second version
  await user.type(input, "v2.0.0");
  await user.keyboard("{Enter}");

  expect(screen.getByText("v1.0.0")).toBeInTheDocument();
  expect(screen.getByText("v2.0.0")).toBeInTheDocument();
});

test("removes manufacturerEstaId from state when set to empty string", async () => {
  const user = userEvent.setup();
  render(<DeviceInfoEditor />);

  const input = screen.getByLabelText("Manufacturer ESTA ID");
  expect(input).toBeInTheDocument();

  // First set a value
  await changeConfirmableInputField(user, input, "12345");

  // Verify the value is set in the state
  let state = useAppPersistentStore.getState();
  let currentEditor = state.deviceClassEditors[state.openEditors.editors[0].id];
  expect(currentEditor.basicData.manufacturerEstaId).toBe("12345");

  // Now clear the field
  await user.clear(input);
  await user.keyboard("{Enter}");

  // Wait for the input to be empty
  await waitFor(() => {
    expect(input).toHaveValue("");
  });

  // Verify the property is undefined (removed) in the state
  state = useAppPersistentStore.getState();
  currentEditor = state.deviceClassEditors[state.openEditors.editors[0].id];
  expect(currentEditor.basicData.manufacturerEstaId).toBeUndefined();
});
