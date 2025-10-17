import { getByText, screen } from "@testing-library/react";

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
