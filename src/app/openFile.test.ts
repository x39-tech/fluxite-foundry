import { beforeEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "@tauri-apps/api/core";
import { openFile, OpenedFile } from "./openFile";

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(),
}));

const open = vi.fn();
const readFile = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => open(...args) as unknown,
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: (...args: unknown[]) => readFile(...args) as unknown,
}));

const runningOnDesktop = (onDesktop: boolean) =>
  vi.mocked(isTauri).mockReturnValue(onDesktop);

describe("openFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("in the browser", () => {
    beforeEach(() => runningOnDesktop(false));

    it("reports the file the picker gives it, and no path", async () => {
      const file = new File(["contents"], "my-device.ffd");
      pickerReturns(file);

      const result = (await openFile(["ffd"])) as OpenedFile;

      expect(result.name).toBe("my-device.ffd");
      expect(result.path).toBeUndefined();
      expect(await result.data.text()).toBe("contents");
    });

    it("offers only the extensions it was asked for", async () => {
      const input = pickerReturns(new File(["contents"], "my-device.ffd"));

      await openFile(["ffd", "ffl"]);

      expect(input.accept).toBe(".ffd,.ffl");
    });

    it("reports a dismissed picker as cancelled", async () => {
      pickerDismissed();

      expect(await openFile(["ffd"])).toBe("cancelled");
    });

    it("does not reach for the native dialog", async () => {
      pickerDismissed();

      await openFile(["ffd"]);

      expect(open).not.toHaveBeenCalled();
      expect(readFile).not.toHaveBeenCalled();
    });
  });

  describe("on the desktop", () => {
    beforeEach(() => runningOnDesktop(true));

    it("reads the file at the path chosen in the open dialog", async () => {
      open.mockResolvedValue("/Users/someone/my-device.ffd");
      readFile.mockResolvedValue(new TextEncoder().encode("contents"));

      const result = (await openFile(["ffd"])) as OpenedFile;

      expect(readFile).toHaveBeenCalledWith("/Users/someone/my-device.ffd");
      expect(result.path).toBe("/Users/someone/my-device.ffd");
      expect(result.name).toBe("my-device.ffd");
      expect(await result.data.text()).toBe("contents");
    });

    it("offers a filter for the file type", async () => {
      open.mockResolvedValue(null);

      await openFile(["ffd"], "Fluxite Foundry Document");

      expect(open).toHaveBeenCalledWith({
        multiple: false,
        directory: false,
        filters: [{ name: "Fluxite Foundry Document", extensions: ["ffd"] }],
      });
    });

    it("reads nothing when the user cancels the dialog", async () => {
      open.mockResolvedValue(null);

      expect(await openFile(["ffd"])).toBe("cancelled");
      expect(readFile).not.toHaveBeenCalled();
    });
  });
});

// The file input is created by openFile itself, so the test hands it one it can
// drive and makes clicking it behave as a picker would.
function makePicker(onClick: (input: HTMLInputElement) => void) {
  const input = document.createElement("input");
  vi.spyOn(document, "createElement").mockReturnValueOnce(input);
  vi.spyOn(input, "click").mockImplementation(() => onClick(input));
  return input;
}

function pickerReturns(file: File) {
  return makePicker((input) => {
    Object.defineProperty(input, "files", {
      value: { item: (index: number) => (index === 0 ? file : null) },
    });
    input.dispatchEvent(new Event("change"));
  });
}

function pickerDismissed() {
  return makePicker((input) => input.dispatchEvent(new Event("cancel")));
}
