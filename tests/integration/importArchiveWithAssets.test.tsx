/**
 * Integration test for importing device class archives with asset resources.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import JSZip from "jszip";
import { E173Archive, E173Document } from "@cpwg-community/delver";
import { EntityType, OrgId, buildQualifiedId } from "../../src/utils/utils";
import {
  CODEX_ARCHIVE_SCHEMA_URL,
  CODEX_DOC_SCHEMA_URL,
} from "../../src/consts";

// Helper to create a test image (1x1 red pixel PNG)
function createTestImage(): ArrayBuffer {
  // 1x1 red pixel PNG (base64 encoded)
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array.buffer;
}

// Helper to create a device class archive with assets
async function createArchiveWithAssets(
  orgId: OrgId,
  deviceId: string,
  version: string,
): Promise<{ archive: E173Archive; archiveFile: File }> {
  const qualifiedId = buildQualifiedId(EntityType.Dev, orgId, deviceId);
  const assetsDir = `${qualifiedId}/${version}/assets`;
  const testImageName = "logo.png";

  // Create the E173 archive with a device class that has a resource with an asset
  const e173Archive: E173Archive = {
    e173archive: {
      deviceClasses: {
        [qualifiedId]: {
          [version]: {
            assetsDirectory: assetsDir,
          },
        },
      },
    },
    $schema: CODEX_ARCHIVE_SCHEMA_URL,
  };

  const e173Doc: E173Document = {
    e173doc: {
      deviceClasses: {
        [qualifiedId]: {
          [version]: {
            "@description": "test_desc",
            publishDate: "2025-10-18",
            author: "Test",
            history: {},
            libraries: {
              "org.esta.lib.core": "1.0.0",
            },
            info: {
              manufacturer: {
                name: "Test Manufacturer",
                url: "https://example.com",
              },
              model: {
                name: "Test Device",
                category: "lighting",
                subcategory: "fixed-other",
              },
            },
            resources: {
              logo: {
                library: "org.esta.lib.core",
                class: "preview-image",
                access: ["read"],
                lifetime: "static",
                default: testImageName,
                mediaType: "image/png",
              },
            },
          },
        },
      },
    },
    $schema: CODEX_DOC_SCHEMA_URL,
  };

  // Create the archive as a zip file
  const zip = new JSZip();

  // Add the E173 archive manifest
  zip.file("e173archive.json", JSON.stringify(e173Archive));
  zip.file("test_class.json", JSON.stringify(e173Doc));

  // Add the test image asset
  const testImage = createTestImage();
  zip.file(`${assetsDir}/${testImageName}`, testImage);

  // Generate the archive
  const archiveBlob = await zip.generateAsync({ type: "blob" });
  const archiveFile = new File([archiveBlob], "test-device.fca", {
    type: "application/zip",
  });

  return {
    archive: e173Archive,
    archiveFile,
  };
}

test("imports device class archive with assets and displays them in resources editor", async () => {
  const user = userEvent.setup();

  // Set up test data
  const orgId: OrgId = {
    type: "user",
    id: "12345678-1234-1234-1234-123456789abc",
  };
  const deviceId = "test-device";
  const version = "1.0.0";

  // Create an archive with an asset
  const { archiveFile } = await createArchiveWithAssets(
    orgId,
    deviceId,
    version,
  );

  // Render the TopNavBar to access the import UI
  const { TopNavBar } = await import("../../src/features/topNavBar/TopNavBar");
  const { unmount } = render(<TopNavBar />);

  const appMenuButton = screen.getByRole("button", { name: "App Menu" });
  await user.click(appMenuButton);

  const importMenuItem = await screen.findByText("Import Fluxite Codex...");
  await user.click(importMenuItem);

  // Find the file input and assign the file
  const fileInput = await screen.findByLabelText(/file/i);
  await user.upload(fileInput, archiveFile);

  // Wait for file validation to complete by waiting for the device class selector to appear
  await screen.findByText(/Select Device Class/i, {}, { timeout: 3000 });

  const importButton = await screen.findByRole("button", { name: "Import" });
  await user.click(importButton);

  unmount();

  // Now render the ResourcesEditor to verify the assets loaded
  const { ResourcesEditor } = await import(
    "../../src/features/deviceClassEditor/resourcesEditor/ResourcesEditor"
  );

  render(<ResourcesEditor />);

  // The logo resource should appear in the list (there are two - one in the sidebar, one in the editor title)
  const logoTexts = await screen.findAllByText("logo", {}, { timeout: 3000 });
  expect(logoTexts.length).toBeGreaterThan(0);

  // Click on the logo resource in the sidebar to select it
  const logoButton = screen.getByRole("button", { name: "logo" });
  await user.click(logoButton);

  // The asset should be loaded and displayed as an image
  const images = await screen.findAllByRole("img");

  // Find the asset image (should have image/png in alt text)
  const assetImage = images.find((img) => {
    const alt = img.getAttribute("alt");
    return alt?.includes("image/png");
  });

  expect(assetImage).toBeTruthy();
  expect(assetImage?.getAttribute("src")).toMatch(/^blob:/);

  // Verify the Details button exists (indicates asset was loaded successfully)
  const detailsButton = await screen.findByRole("button", { name: "Details" });
  expect(detailsButton).toBeInTheDocument();
});
