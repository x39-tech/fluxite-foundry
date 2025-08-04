import { render, screen, waitFor } from "@testing-library/react";
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
  const { container } = render(<DeviceInfoEditor />);

  const categoryRow = getEditorTableRow("Category", container);
  const categorySelect = categoryRow.querySelector("select");
  expect(categorySelect).toBeInTheDocument();

  if (categorySelect) {
    const options = Array.from(categorySelect.querySelectorAll("option"));
    expect(options.length).toBeGreaterThan(0);

    // Verify at least one valid category is available
    const categoryValues = Object.values(Category);
    const hasValidCategory = options.some((option) =>
      categoryValues.includes(option.value as Category),
    );
    expect(hasValidCategory).toBe(true);
  }
});

test("subcategory field has options", async () => {
  const { container } = render(<DeviceInfoEditor />);

  const subcategoryRow = getEditorTableRow("Subcategory", container);
  const subcategorySelect = subcategoryRow.querySelector("select");
  expect(subcategorySelect).toBeInTheDocument();

  if (subcategorySelect) {
    const options = Array.from(subcategorySelect.querySelectorAll("option"));
    expect(options.length).toBeGreaterThan(0);
    expect(subcategorySelect.value).toBeTruthy();
  }
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
  const categorySelect = categoryRow.querySelector("select");
  expect(categorySelect).toBeInTheDocument();

  if (categorySelect) {
    const initialValue = categorySelect.value;
    const options = Array.from(categorySelect.querySelectorAll("option"));
    const differentOption = options.find(
      (option) => option.value !== initialValue,
    );

    if (differentOption) {
      await user.selectOptions(categorySelect, differentOption.value);

      await waitFor(() => {
        expect(categorySelect.value).toBe(differentOption.value);
      });
    }
  }
});

test("can change subcategory field", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const subcategoryRow = getEditorTableRow("Subcategory", container);
  const subcategorySelect = subcategoryRow.querySelector("select");
  expect(subcategorySelect).toBeInTheDocument();

  if (subcategorySelect) {
    const initialValue = subcategorySelect.value;
    const options = Array.from(subcategorySelect.querySelectorAll("option"));
    const differentOption = options.find(
      (option) => option.value !== initialValue,
    );

    if (differentOption) {
      await user.selectOptions(subcategorySelect, differentOption.value);

      await waitFor(() => {
        expect(subcategorySelect.value).toBe(differentOption.value);
      });
    }
  }
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
  const tagInput = firmwareVersionsRow.querySelector(".bp5-tag-input");
  expect(tagInput).toBeInTheDocument();

  if (tagInput) {
    const input = tagInput.querySelector("input");
    expect(input).toBeInTheDocument();

    if (input) {
      await user.click(input);
      await user.type(input, "v1.0.0");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        const tags = tagInput.querySelectorAll(".bp5-tag");
        expect(tags.length).toBeGreaterThan(0);
        expect(
          Array.from(tags).some((tag) => tag.textContent?.includes("v1.0.0")),
        ).toBe(true);
      });
    }
  }
});

test("can add multiple firmware versions", async () => {
  const user = userEvent.setup();
  const { container } = render(<DeviceInfoEditor />);

  const firmwareVersionsRow = getEditorTableRow("Firmware Versions", container);
  const tagInput = firmwareVersionsRow.querySelector(".bp5-tag-input");
  expect(tagInput).toBeInTheDocument();

  if (tagInput) {
    const input = tagInput.querySelector("input");
    expect(input).toBeInTheDocument();

    if (input) {
      // Add first version
      await user.click(input);
      await user.type(input, "v1.0.0");
      await user.keyboard("{Enter}");

      // Add second version
      await user.type(input, "v2.0.0");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        const tags = tagInput.querySelectorAll(".bp5-tag");
        expect(tags.length).toBeGreaterThanOrEqual(2);
        const tagTexts = Array.from(tags).map((tag) => tag.textContent);
        expect(tagTexts.some((text) => text?.includes("v1.0.0"))).toBe(true);
        expect(tagTexts.some((text) => text?.includes("v2.0.0"))).toBe(true);
      });
    }
  }
});
