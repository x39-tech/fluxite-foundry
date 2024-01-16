/**
 * @jest-environment happy-dom
 */
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import App from "./App";

test("Renders a tooltip and add editor button when no editor is open", async () => {
  render(<App />);

  expect(
    screen.getByRole("button", { name: "Add New Editor" }),
  ).toBeInTheDocument();
  await screen.findByText(/get started/i);
});

test("Renders an editor when one is open", async () => {
  render(<App />);

  await userEvent.click(screen.getByRole("button", { name: "Add New Editor" }));

  // Top button
  expect(screen.getAllByText("Super Light")[0]).toBeInTheDocument();

  // Editor panes
  expect(screen.getByText(/parameters/i)).toBeInTheDocument();
});
