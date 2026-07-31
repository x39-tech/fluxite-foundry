import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExportStateDialog } from "./ExportStateDialog";
import { saveFile } from "app/saveFile";
import { parseStateSnapshot } from "app/stateSnapshot";
import { VERSION as STATE_VERSION } from "app/persistentState";

vi.mock("app/saveFile", () => ({
  saveFile: vi.fn().mockResolvedValue("saved"),
}));

/** The snapshot handed to saveFile by the most recent export. */
async function savedSnapshot() {
  const [blob] = vi.mocked(saveFile).mock.calls[0];
  return parseStateSnapshot(await blob.text());
}

describe("ExportStateDialog", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAndExport = async () => {
    await userEvent.click(screen.getByRole("button", { name: "Export" }));
    await waitFor(() => expect(saveFile).toHaveBeenCalled());
  };

  it("exports the current state with assets by default", async () => {
    render(<ExportStateDialog isOpen={true} onClose={onClose} />);

    await renderAndExport();

    const snapshot = await savedSnapshot();
    expect(snapshot.stateVersion).toBe(STATE_VERSION);
    expect(snapshot.assets).toBeDefined();
    expect(onClose).toHaveBeenCalled();
  });

  it("omits assets when they are unchecked", async () => {
    render(<ExportStateDialog isOpen={true} onClose={onClose} />);

    await userEvent.click(screen.getByRole("checkbox"));
    await renderAndExport();

    expect((await savedSnapshot()).assets).toBeUndefined();
  });
});
