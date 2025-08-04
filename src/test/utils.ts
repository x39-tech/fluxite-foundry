import { getByText, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

export function getEditorTableRow(
  labelText: string,
  element?: HTMLElement,
): HTMLElement {
  const labelElem = (() => {
    if (element) {
      return getByText(element, labelText);
    } else {
      return screen.getByText(labelText);
    }
  })();

  if (!labelElem.parentElement) {
    throw Error(`${labelElem} did not have a parent element`);
  }

  return labelElem.parentElement;
}

// Returns the second column of the row with the given label text.
export function getEditorTableRowSecondCol(
  labelText: string,
  element?: HTMLElement,
): HTMLElement {
  const row = getEditorTableRow(labelText, element);
  const tdElement = row.querySelector<HTMLElement>("td:nth-child(2)");
  if (!tdElement) {
    throw Error(`No second column found for row with label ${labelText}`);
  }
  return tdElement;
}

export async function changeConfirmableInputField(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement,
  newValue: string,
) {
  const inputElement = container.querySelector("input");
  if (!inputElement) {
    throw Error("No input element found");
  }

  await user.clear(inputElement);
  await user.type(inputElement, newValue);
  await user.keyboard("{Enter}");

  // Wait for the input to have the new value after confirmation
  await waitFor(() => {
    expect(inputElement).toHaveValue(newValue);
  });
}
