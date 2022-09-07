import { screen } from "@testing-library/react";
import App from "./App";
import { renderWithProviders } from "utils/testUtils";
import { newEditorTab } from "utils/editorTabState";

test("Renders a tooltip and add fixture button when no fixture editor is open", async () => {
  renderWithProviders(<App />);

  expect(
    screen.getByRole("button", { name: "Add New Editor" })
  ).toBeInTheDocument();
  await screen.findByText(/get started/i);
});

test("Renders a fixture editor when one is open", async () => {
  renderWithProviders(<App />, {
    preloadedState: {
      appSettings: {
        darkMode: false,
        threeDViewEnabled: false,
      },
      fixtureEditor: {
        openEditors: {
          "1f1c3350-1a14-4a4c-b90f-d8b076b4ae02": newEditorTab("My Fixture"),
        },
        editorTabOrder: ["1f1c3350-1a14-4a4c-b90f-d8b076b4ae02"],
        selectedEditor: "1f1c3350-1a14-4a4c-b90f-d8b076b4ae02",
      },
    },
  });

  // Top button
  expect(screen.getByText("My Fixture")).toBeInTheDocument();

  // Editor panes
  expect(screen.getByText(/scalar items/i)).toBeInTheDocument();
  expect(screen.getByText(/structured items/i)).toBeInTheDocument();
});
