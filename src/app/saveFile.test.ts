import { beforeEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "@tauri-apps/api/core";
import { saveFile, writeFileToPath } from "./saveFile";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(),
}));

const save = vi.fn();
const writeFile = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => save(...args) as unknown,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  writeFile: (...args: unknown[]) => writeFile(...args) as unknown,
}));

const runningOnDesktop = (onDesktop: boolean) =>
  vi.mocked(isTauri).mockReturnValue(onDesktop);

describe("saveFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("in the browser", () => {
    beforeEach(() => runningOnDesktop(false));

    it("hands the file to the download manager under the suggested name", async () => {
      const anchor = document.createElement("a");
      const clickSpy = vi.spyOn(anchor, "click").mockImplementation(() => {});
      vi.spyOn(document, "createElement").mockReturnValueOnce(anchor);

      const result = await saveFile(new Blob(["contents"]), "my-device.fcd");

      expect(result).toEqual({ status: "saved" });
      expect(clickSpy).toHaveBeenCalled();
      expect(anchor.download).toBe("my-device.fcd");
    });

    it("does not reach for the native dialog", async () => {
      await saveFile(new Blob(["contents"]), "my-device.fcd");

      expect(save).not.toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe("on the desktop", () => {
    beforeEach(() => runningOnDesktop(true));

    it("writes the blob to the path chosen in the save dialog", async () => {
      save.mockResolvedValue("/Users/someone/my-device.fcd");

      const result = await saveFile(new Blob(["contents"]), "my-device.fcd");

      expect(result).toEqual({
        status: "saved",
        path: "/Users/someone/my-device.fcd",
      });
      expect(writeFile).toHaveBeenCalledWith(
        "/Users/someone/my-device.fcd",
        new Uint8Array(await new Blob(["contents"]).arrayBuffer()),
      );
    });

    it("offers the suggested name and a filter for the file type", async () => {
      save.mockResolvedValue("/Users/someone/my-device.fca");

      await saveFile(
        new Blob(["contents"]),
        "my-device.fca",
        "Fluxite Codex Archive",
      );

      expect(save).toHaveBeenCalledWith({
        defaultPath: "my-device.fca",
        filters: [{ name: "Fluxite Codex Archive", extensions: ["fca"] }],
      });
    });

    it("writes nothing when the user cancels the dialog", async () => {
      save.mockResolvedValue(null);

      const result = await saveFile(new Blob(["contents"]), "my-device.fcd");

      expect(result).toEqual({ status: "cancelled" });
      expect(writeFile).not.toHaveBeenCalled();
    });
  });
});

describe("writeFileToPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes to the path without asking the user anything", async () => {
    runningOnDesktop(true);

    await writeFileToPath(new Blob(["contents"]), "/Users/someone/my-doc.ffd");

    expect(save).not.toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith(
      "/Users/someone/my-doc.ffd",
      new Uint8Array(await new Blob(["contents"]).arrayBuffer()),
    );
  });

  it("refuses in the browser, which has no paths to write to", async () => {
    runningOnDesktop(false);

    await expect(
      writeFileToPath(new Blob(["contents"]), "/Users/someone/my-doc.ffd"),
    ).rejects.toThrow("desktop");
    expect(writeFile).not.toHaveBeenCalled();
  });
});
