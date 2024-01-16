import { getByText, screen } from "@testing-library/react";

// A few implementation details :(
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
