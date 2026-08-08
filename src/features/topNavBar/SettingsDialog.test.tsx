import { render, screen } from "test/render";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SettingsDialog } from "./SettingsDialog";

describe("SettingsDialog", () => {
  const onClose = vi.fn();

  it("shows the settings it offers", () => {
    render(<SettingsDialog isOpen={true} onClose={onClose} />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Configure application preferences"),
    ).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
  });

  it("offers each theme by name", async () => {
    render(<SettingsDialog isOpen={true} onClose={onClose} />);

    await userEvent.click(screen.getByRole("combobox", { name: "Theme" }));

    for (const theme of ["Light", "Dark", "System"]) {
      expect(screen.getByRole("option", { name: theme })).toBeInTheDocument();
    }
  });

  describe("the language setting", () => {
    it("offers each language this build carries, named in itself", async () => {
      render(<SettingsDialog isOpen={true} onClose={onClose} />);

      await userEvent.click(screen.getByRole("combobox", { name: "Language" }));

      expect(
        screen.getByRole("option", { name: "English" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Pseudo-English (testing)" }),
      ).toBeInTheDocument();
    });

    it("shows the language the app is currently displayed in", () => {
      render(<SettingsDialog isOpen={true} onClose={onClose} />);

      expect(
        screen.getByRole("combobox", { name: "Language" }),
      ).toHaveTextContent("English");
    });
  });
});
