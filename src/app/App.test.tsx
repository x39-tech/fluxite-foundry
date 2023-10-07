/**
 * @jest-environment happy-dom
 */
import { screen } from "@testing-library/react";
import { renderWithProviders } from "utils/testUtils";
import { newDeviceClassEditor } from "features/deviceClassEditor/deviceClassEditorState";
import { expect, test } from "vitest";
import App from "./App";

test("Renders a tooltip and add editor button when no editor is open", async () => {
  renderWithProviders(<App />);

  expect(
    screen.getByRole("button", { name: "Add New Editor" }),
  ).toBeInTheDocument();
  await screen.findByText(/get started/i);
});

test("Renders an editor when one is open", async () => {
  renderWithProviders(<App />, {
    preloadedState: {
      appSettings: {
        darkMode: false,
      },
      editors: {
        openEditors: {
          "1f1c3350-1a14-4a4c-b90f-d8b076b4ae02": newDeviceClassEditor([]),
        },
        editorTabOrder: ["1f1c3350-1a14-4a4c-b90f-d8b076b4ae02"],
        selectedEditor: "1f1c3350-1a14-4a4c-b90f-d8b076b4ae02",
      },
    },
  });

  // Top button
  expect(screen.getAllByText("Super Light")[0]).toBeInTheDocument();

  // Editor panes
  expect(screen.getByText(/parameters/i)).toBeInTheDocument();
});
