import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImportStateDialog } from "./ImportStateDialog";
import {
  applyStateSnapshot,
  SNAPSHOT_FORMAT_VERSION,
  StateSnapshot,
} from "app/stateSnapshot";
import { reloadApp } from "utils/utils";
import { VERSION as STATE_VERSION } from "app/persistentState";

vi.mock("app/stateSnapshot", async (importOriginal) => ({
  ...(await importOriginal<typeof import("app/stateSnapshot")>()),
  applyStateSnapshot: vi.fn(),
}));

vi.mock("utils/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("utils/utils")>()),
  reloadApp: vi.fn(),
}));

function snapshotFile(contents: string): File {
  return new File([contents], "state.json", { type: "application/json" });
}

function validSnapshot(overrides: Partial<StateSnapshot> = {}): string {
  return JSON.stringify({
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    stateVersion: 1,
    state: { appSettings: { theme: "dark" } },
    ...overrides,
  });
}

describe("ImportStateDialog", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAndSelectFile = async (contents: string) => {
    render(<ImportStateDialog isOpen={true} onClose={onClose} />);
    await userEvent.upload(
      screen.getByLabelText("Select state file to import"),
      snapshotFile(contents),
    );
  };

  it("disables import until a file is selected", () => {
    render(<ImportStateDialog isOpen={true} onClose={onClose} />);

    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("summarizes the selected snapshot", async () => {
    await renderAndSelectFile(validSnapshot({ stateVersion: 1 }));

    expect(
      await screen.findByText(`v1 (will migrate to v${STATE_VERSION})`),
    ).toBeInTheDocument();
    expect(
      screen.getByText("not included (stored assets kept)"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeEnabled();
  });

  it("explains why an unusable file cannot be imported", async () => {
    await renderAndSelectFile("this is not a snapshot");

    expect(
      await screen.findByText("The selected file cannot be imported."),
    ).toBeInTheDocument();
    expect(screen.getByText(/not valid JSON/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("applies the snapshot and reloads on import", async () => {
    await renderAndSelectFile(validSnapshot({ stateVersion: 1 }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Import" })).toBeEnabled(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(reloadApp).toHaveBeenCalled());
    expect(applyStateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ stateVersion: 1 }),
    );
  });
});
