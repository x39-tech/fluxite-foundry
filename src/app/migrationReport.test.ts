import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "@tauri-apps/api/core";
import {
  clearMigrationReport,
  MigrationReport,
  openMigrationReport,
  setMigrationReport,
} from "./migrationReport";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(),
}));

const mkdir = vi.fn();
const writeTextFile = vi.fn();
const openPath = vi.fn();

vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: (...args: unknown[]) => mkdir(...args) as unknown,
  writeTextFile: (...args: unknown[]) => writeTextFile(...args) as unknown,
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openPath: (...args: unknown[]) => openPath(...args) as unknown,
}));

vi.mock("@tauri-apps/api/path", () => ({
  appCacheDir: () =>
    Promise.resolve("/Users/someone/Library/Caches/dev.fluxite.foundry"),
  join: (...paths: string[]) => Promise.resolve(paths.join("/")),
}));

const runningOnDesktop = (onDesktop: boolean) =>
  vi.mocked(isTauri).mockReturnValue(onDesktop);

const aReport = (): MigrationReport => ({
  startVersion: 1,
  endVersion: 2,
  initialState: { editors: [] },
  steps: [
    {
      fromVersion: 1,
      toVersion: 2,
      description: "Add a thing",
      stateAfter: { editors: [] },
      diff: undefined,
    },
  ],
  success: true,
});

describe("openMigrationReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMigrationReport(aReport());
  });

  afterEach(() => {
    clearMigrationReport();
    vi.unstubAllGlobals();
  });

  it("reports failure when there is no report to show", async () => {
    clearMigrationReport();
    runningOnDesktop(false);

    expect(await openMigrationReport()).toBe(false);
  });

  describe("in the browser", () => {
    beforeEach(() => runningOnDesktop(false));

    it("opens the report in a new tab", async () => {
      const open = vi.fn().mockReturnValue({ addEventListener: vi.fn() });
      vi.stubGlobal("open", open);

      expect(await openMigrationReport()).toBe(true);
      expect(open).toHaveBeenCalledWith(expect.any(String), "_blank");
    });

    it("reports failure when the pop-up is blocked", async () => {
      vi.stubGlobal("open", vi.fn().mockReturnValue(null));

      expect(await openMigrationReport()).toBe(false);
    });
  });

  describe("on the desktop", () => {
    beforeEach(() => runningOnDesktop(true));

    it("writes the report to the cache directory and opens it", async () => {
      const expectedPath =
        "/Users/someone/Library/Caches/dev.fluxite.foundry/migration-report.html";

      expect(await openMigrationReport()).toBe(true);

      expect(writeTextFile).toHaveBeenCalledWith(
        expectedPath,
        expect.stringContaining("<html"),
      );
      expect(openPath).toHaveBeenCalledWith(expectedPath);
    });

    it("creates the cache directory before writing, since it may not exist", async () => {
      await openMigrationReport();

      expect(mkdir).toHaveBeenCalledWith(
        "/Users/someone/Library/Caches/dev.fluxite.foundry",
        { recursive: true },
      );
      expect(mkdir.mock.invocationCallOrder[0]).toBeLessThan(
        writeTextFile.mock.invocationCallOrder[0],
      );
    });

    it("propagates a failure to open the report", async () => {
      openPath.mockRejectedValue(new Error("no default browser"));

      await expect(openMigrationReport()).rejects.toThrow("no default browser");
    });
  });
});
