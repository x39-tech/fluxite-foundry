import { getByRole, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeviceInfoEditor } from "./DeviceInfoEditor";
import { createDeviceClassEditor } from "features/topNavBar/state";
import {
  changeConfirmableInputField,
  getEditorTableRow,
  getEditorTableRowSecondCol,
} from "test/utils";
import { Category } from "e173";

beforeEach(() => {
  createDeviceClassEditor();
});

test("renders all manufacturer information fields", () => {
  const { container } = render(<DeviceInfoEditor />);

  expect(screen.getByText("Manufacturer Information")).toBeInTheDocument();
  expect(getEditorTableRow("Manufacturer Name", container)).toBeInTheDocument();
  expect(getEditorTableRow("Manufacturer URL", container)).toBeInTheDocument();
  expect(
    getEditorTableRow("Manufacturer ESTA ID", container),
  ).toBeInTheDocument();
});

test("renders all model information fields", () => {
  const { container } = render(<DeviceInfoEditor />);

  expect(screen.getByText("Model Information")).toBeInTheDocument();
  expect(getEditorTableRow("Model Name", container)).toBeInTheDocument();
  expect(getEditorTableRow("Category", container)).toBeInTheDocument();
  expect(getEditorTableRow("Subcategory", container)).toBeInTheDocument();
});

test("renders compatibility section", () => {
  const { container } = render(<DeviceInfoEditor />);

  expect(screen.getByText("Compatibility")).toBeInTheDocument();
  expect(getEditorTableRow("Firmware Versions", container)).toBeInTheDocument();
});

test("renders UDR device class information section", () => {
  const { container } = render(<DeviceInfoEditor />);

  expect(screen.getByText("UDR Device Class Information")).toBeInTheDocument();
  expect(getEditorTableRow("Description", container)).toBeInTheDocument();
  expect(getEditorTableRow("Author", container)).toBeInTheDocument();
  expect(getEditorTableRow("Publish Date", container)).toBeInTheDocument();
});

test("category field has valid options", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const categoryRow = getEditorTableRow("Category", container);
  const categorySelect = getByRole(categoryRow, "combobox");
  expect(categorySelect).toBeInTheDocument();

  // Focus and use keyboard to open the dropdown (more reliable in tests)
  categorySelect.focus();
  await user.keyboard("{ArrowDown}");

  // Find all options (they appear as listbox options when opened)
  const options = await screen.findAllByRole("option");
  expect(options.length).toBeGreaterThan(0);

  // Verify at least one valid category is available
  const categoryValues = Object.values(Category);
  const hasValidCategory = options.some((option) =>
    categoryValues.includes(option.textContent as Category),
  );
  expect(hasValidCategory).toBe(true);
});

test("subcategory field has options", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const subcategoryRow = getEditorTableRow("Subcategory", container);
  const subcategorySelect = getByRole(subcategoryRow, "combobox");
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
  const { container } = render(<DeviceInfoEditor />);

  const tdElement = getEditorTableRowSecondCol("Manufacturer Name", container);
  expect(tdElement).toBeInTheDocument();

  if (tdElement) {
    await changeConfirmableInputField(user, tdElement, "New Manufacturer Name");
  }
});

test("can change model name field", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const tdElement = getEditorTableRowSecondCol("Model Name", container);
  expect(tdElement).toBeInTheDocument();

  if (tdElement) {
    await changeConfirmableInputField(user, tdElement, "New Model Name");
  }
});

test("can change category field", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const categoryRow = getEditorTableRow("Category", container);
  const categorySelect = getByRole(categoryRow, "combobox");
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
  const { container } = render(<DeviceInfoEditor />);

  const subcategoryRow = getEditorTableRow("Subcategory", container);
  const subcategorySelect = getByRole(subcategoryRow, "combobox");
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
  const { container } = render(<DeviceInfoEditor />);

  const tdElement = getEditorTableRowSecondCol("Description", container);
  expect(tdElement).toBeInTheDocument();

  if (tdElement) {
    await changeConfirmableInputField(
      user,
      tdElement,
      "New Device Description",
    );
  }
});

test("can change author field", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const tdElement = getEditorTableRowSecondCol("Author", container);
  expect(tdElement).toBeInTheDocument();

  if (tdElement) {
    await changeConfirmableInputField(user, tdElement, "New Author Name");
  }
});

test("can change publish date field", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const tdElement = getEditorTableRowSecondCol("Publish Date", container);
  expect(tdElement).toBeInTheDocument();

  if (tdElement) {
    await changeConfirmableInputField(user, tdElement, "New Publish Date");
  }
});

test("can change manufacturer URL field", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const tdElement = getEditorTableRowSecondCol("Manufacturer URL", container);
  expect(tdElement).toBeInTheDocument();

  if (tdElement) {
    await changeConfirmableInputField(user, tdElement, "https://example.com");
  }
});

test("can change manufacturer ESTA ID field", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const tdElement = getEditorTableRowSecondCol(
    "Manufacturer ESTA ID",
    container,
  );
  expect(tdElement).toBeInTheDocument();

  if (tdElement) {
    await changeConfirmableInputField(user, tdElement, "12345");
  }
});

test("can add firmware versions using tag input", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const firmwareVersionsRow = getEditorTableRow("Firmware Versions", container);

  const input = getByRole(firmwareVersionsRow, "textbox");
  expect(input).toBeInTheDocument();

  await user.type(input, "v1.0.0");
  await user.keyboard("{Enter}");

  expect(screen.getByText("v1.0.0")).toBeInTheDocument();
});

test("can add multiple firmware versions", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const firmwareVersionsRow = getEditorTableRow("Firmware Versions", container);

  const input = getByRole(firmwareVersionsRow, "textbox");
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
