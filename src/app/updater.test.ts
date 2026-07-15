import { beforeEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "@tauri-apps/api/core";
import { checkForUpdate } from "./updater";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(),
}));

const check = vi.fn();
const downloadAndInstall = vi.fn();
const relaunch = vi.fn();

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: () => check() as unknown,
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: () => relaunch() as unknown,
}));

const runningOnDesktop = (onDesktop: boolean) =>
  vi.mocked(isTauri).mockReturnValue(onDesktop);

describe("checkForUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports no update in the browser, which updates by reloading", async () => {
    runningOnDesktop(false);

    expect(await checkForUpdate()).toBeNull();
    expect(check).not.toHaveBeenCalled();
  });

  describe("on the desktop", () => {
    beforeEach(() => runningOnDesktop(true));

    it("reports no update when running the latest version", async () => {
      check.mockResolvedValue(null);

      expect(await checkForUpdate()).toBeNull();
    });

    it("reports the version and notes of an available update", async () => {
      check.mockResolvedValue({
        version: "0.2.0",
        body: "Fixed a thing",
        downloadAndInstall,
      });

      const update = await checkForUpdate();

      expect(update).toMatchObject({
        version: "0.2.0",
        notes: "Fixed a thing",
      });
    });

    it("restarts into the new version once it is installed", async () => {
      check.mockResolvedValue({ version: "0.2.0", downloadAndInstall });

      const update = await checkForUpdate();
      await update?.install();

      expect(downloadAndInstall).toHaveBeenCalled();
      expect(relaunch).toHaveBeenCalled();
      expect(downloadAndInstall.mock.invocationCallOrder[0]).toBeLessThan(
        relaunch.mock.invocationCallOrder[0],
      );
    });

    it("does not restart if the install failed", async () => {
      downloadAndInstall.mockRejectedValue(new Error("download failed"));
      check.mockResolvedValue({ version: "0.2.0", downloadAndInstall });

      const update = await checkForUpdate();

      await expect(update?.install()).rejects.toThrow("download failed");
      expect(relaunch).not.toHaveBeenCalled();
    });
  });
});
