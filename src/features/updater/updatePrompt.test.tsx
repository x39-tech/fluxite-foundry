import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "components/scn-ui/Sonner";
import { AvailableUpdate, checkForUpdate } from "app/updater";
import {
  checkForUpdateInteractively,
  checkForUpdateOnStartup,
} from "./updatePrompt";

vi.mock("app/updater", () => ({
  checkForUpdate: vi.fn(),
}));

const install = vi.fn();

const updateIsAvailable = (version = "0.2.0", notes?: string) => {
  const update: AvailableUpdate = { version, notes, install };
  vi.mocked(checkForUpdate).mockResolvedValue(update);
  return update;
};

const noUpdateIsAvailable = () =>
  vi.mocked(checkForUpdate).mockResolvedValue(null);

const checkFails = () =>
  vi.mocked(checkForUpdate).mockRejectedValue(new Error("offline"));

const showToasts = () => render(<Toaster />);

const offerOf = (version: string) =>
  screen.findByText(`Version ${version} is available`);

const offersOf = (version: string) =>
  screen.queryAllByText(`Version ${version} is available`);

/**
 * A toast renders a tick after the call that queues it, so anything asserting
 * that a toast is absent, or that there is only one of it, has to let the queue
 * drain first. `waitFor` cannot do this: it succeeds on its first pass, which
 * happens before a duplicate would have appeared.
 */
const toastsSettle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

describe("update prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    install.mockResolvedValue(undefined);
  });

  describe("on startup", () => {
    it("offers an available update", async () => {
      updateIsAvailable("0.2.0", "Fixed a thing");
      showToasts();

      await checkForUpdateOnStartup();

      expect(await offerOf("0.2.0")).toBeVisible();
      expect(await screen.findByText("Fixed a thing")).toBeVisible();
    });

    it("says nothing when already up to date", async () => {
      noUpdateIsAvailable();
      showToasts();

      await checkForUpdateOnStartup();
      await toastsSettle();

      expect(screen.queryByText(/is available/)).not.toBeInTheDocument();
      expect(screen.queryByText(/up to date/)).not.toBeInTheDocument();
    });

    it("stays quiet when the check fails, rather than nagging on every launch", async () => {
      checkFails();
      showToasts();

      await checkForUpdateOnStartup();
      await toastsSettle();

      expect(screen.queryByText(/offline/)).not.toBeInTheDocument();
    });
  });

  describe("when the user asks", () => {
    it("offers an available update", async () => {
      updateIsAvailable("0.2.0");
      showToasts();

      await checkForUpdateInteractively();

      expect(await offerOf("0.2.0")).toBeVisible();
    });

    it("confirms when already up to date", async () => {
      noUpdateIsAvailable();
      showToasts();

      await checkForUpdateInteractively();

      expect(
        await screen.findByText("Fluxite Foundry is up to date"),
      ).toBeVisible();
    });

    it("reports a failed check, because the user is waiting on an answer", async () => {
      checkFails();
      showToasts();

      await checkForUpdateInteractively();

      expect(await screen.findByText(/offline/)).toBeVisible();
    });
  });

  describe("offering the same version more than once", () => {
    it("does not stack duplicates when the check runs twice", async () => {
      updateIsAvailable("0.2.0");
      showToasts();

      await checkForUpdateOnStartup();
      await checkForUpdateOnStartup();
      await toastsSettle();

      expect(offersOf("0.2.0")).toHaveLength(1);
    });

    it("does not stack a duplicate when the user checks while an offer is up", async () => {
      updateIsAvailable("0.2.0");
      showToasts();

      await checkForUpdateOnStartup();
      await offerOf("0.2.0");

      await checkForUpdateInteractively();
      await toastsSettle();

      expect(offersOf("0.2.0")).toHaveLength(1);
    });
  });

  describe("dismissing an offer", () => {
    it("lets the user put the update off without installing it", async () => {
      updateIsAvailable("0.2.0");
      showToasts();

      await checkForUpdateOnStartup();
      await offerOf("0.2.0");

      await userEvent.click(screen.getByLabelText("Close toast"));

      await waitFor(() => expect(offersOf("0.2.0")).toHaveLength(0));
      expect(install).not.toHaveBeenCalled();
    });

    it("offers the update again on the next startup", async () => {
      updateIsAvailable("0.2.0");
      showToasts();

      await checkForUpdateOnStartup();
      await offerOf("0.2.0");
      await userEvent.click(screen.getByLabelText("Close toast"));
      await waitFor(() => expect(offersOf("0.2.0")).toHaveLength(0));

      await checkForUpdateOnStartup();

      expect(await offerOf("0.2.0")).toBeVisible();
    });
  });

  describe("installing", () => {
    it("installs the update when the user accepts", async () => {
      updateIsAvailable("0.2.0");
      showToasts();

      await checkForUpdateOnStartup();
      await offerOf("0.2.0");

      await userEvent.click(screen.getByText("Install and restart"));

      await waitFor(() => expect(install).toHaveBeenCalled());
    });

    it("reports an install that failed, leaving the app on the old version", async () => {
      updateIsAvailable("0.2.0");
      install.mockRejectedValue(new Error("signature is invalid"));
      showToasts();

      await checkForUpdateOnStartup();
      await offerOf("0.2.0");

      await userEvent.click(screen.getByText("Install and restart"));

      expect(await screen.findByText(/signature is invalid/)).toBeVisible();
    });
  });
});
