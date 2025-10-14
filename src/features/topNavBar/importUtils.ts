import {
  E173Document,
  E173Archive,
  importUdr,
  importUdrArchive,
  Error as E173Error,
  DeviceClass,
} from "e173";
import JSZip from "jszip";

export enum FeedbackKind {
  UnableToReadFile,
  ValidationFailed,
  ArchiveParsingFailed,
}

export interface DeviceClassToImport {
  id: string;
  version: string;
  fileName: string;
}

export interface UdrImportResult {
  valid: boolean;
  feedbackKind?: FeedbackKind;
  feedback?: string;
  archive?: E173Archive;
  deviceClasses?: DeviceClassToImport[];
}

export async function validateInputFile(file: File): Promise<UdrImportResult> {
  if (file.name.endsWith(".fca")) {
    try {
      return await processUdrArchive(file);
    } catch (_e) {
      return {
        valid: false,
        feedbackKind: FeedbackKind.UnableToReadFile,
      };
    }
  } else if (file.name.endsWith(".fcd")) {
    let content;
    try {
      content = await readFileToString(file);
    } catch (_e) {
      return {
        valid: false,
        feedbackKind: FeedbackKind.UnableToReadFile,
      };
    }

    try {
      const udr = importUdr(content);
      const deviceClasses = extractDeviceClasses(udr, file.name);
      return {
        valid: true,
        deviceClasses,
      };
    } catch (e) {
      const err = e as E173Error;
      const path = err.path ? ` (at ${err.path})` : "";
      return {
        valid: false,
        feedbackKind: FeedbackKind.ValidationFailed,
        feedback: `Document validation failed: ${err.type}: ${err.description}${path}`,
      };
    }
  } else {
    return {
      valid: false,
      feedbackKind: FeedbackKind.ValidationFailed,
      feedback: "Only Fluxite Codex Document or Archive files are supported",
    };
  }
}

async function processUdrArchive(file: File): Promise<UdrImportResult> {
  try {
    const zip = await JSZip.loadAsync(file);

    // Find and parse e173archive.json
    const archiveFile = zip.file("e173archive.json");
    if (!archiveFile) {
      return {
        valid: false,
        feedbackKind: FeedbackKind.ArchiveParsingFailed,
        feedback: "e173archive.json not found in archive root",
      };
    }

    const archiveContent = await archiveFile.async("string");
    let archive: E173Archive;
    try {
      archive = importUdrArchive(archiveContent);
    } catch (e) {
      const err = e as E173Error;
      const path = err.path ? ` (at ${err.path})` : undefined;
      return {
        valid: false,
        feedbackKind: FeedbackKind.ValidationFailed,
        feedback: `Archive validation failed: ${err.type}: ${err.description}${path}`,
      };
    }

    // Find all .json files in the root (excluding e173archive.json)
    const jsonFiles = Object.keys(zip.files).filter(
      (filename) =>
        filename.endsWith(".json") &&
        filename.indexOf("/") === -1 &&
        filename !== "e173archive.json",
    );

    const allDeviceClasses: DeviceClassToImport[] = [];

    // Parse each JSON file and collect device classes
    for (const filename of jsonFiles) {
      const jsonFile = zip.file(filename);
      if (jsonFile) {
        try {
          const content = await jsonFile.async("string");
          const udr = importUdr(content);
          const deviceClasses = extractDeviceClasses(udr, filename);
          allDeviceClasses.push(...deviceClasses);
        } catch (e) {
          // Skip files that can't be parsed as UDR documents
          // TODO better error notification
          console.warn(`Failed to parse ${filename} as UDR document:`, e);
        }
      }
    }

    return {
      valid: true,
      archive,
      deviceClasses: allDeviceClasses,
    };
  } catch (e) {
    return {
      valid: false,
      feedbackKind: FeedbackKind.ArchiveParsingFailed,
      feedback: `Failed to read ZIP archive: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

function extractDeviceClasses(
  udr: E173Document,
  fileName: string,
): DeviceClassToImport[] {
  if (!udr.e173doc.deviceClasses) {
    return [];
  }

  return Object.entries(udr.e173doc.deviceClasses).reduce(
    (accum, [key, value]) => {
      for (const version of Object.keys(value)) {
        accum.push({ id: key, version, fileName });
      }
      return accum;
    },
    [] as DeviceClassToImport[],
  );
}

export async function getDeviceClassFromArchive(
  archiveFile: File,
  dc: DeviceClassToImport,
): Promise<DeviceClass | null> {
  const zip = await JSZip.loadAsync(archiveFile);

  const jsonFile = zip.file(dc.fileName);
  if (!jsonFile) {
    return null;
  }

  try {
    const content = await jsonFile.async("string");
    const udr = importUdr(content);

    if (udr.e173doc.deviceClasses?.[dc.id]?.[dc.version]) {
      return udr.e173doc.deviceClasses[dc.id][dc.version];
    }
    return null;
  } catch (_e) {
    return null;
  }
}

export async function getDeviceClassFromDocument(
  docFile: File,
  dc: DeviceClassToImport,
): Promise<DeviceClass | null> {
  try {
    const content = await readFileToString(docFile);
    const udr = importUdr(content);

    if (udr.e173doc.deviceClasses?.[dc.id]?.[dc.version]) {
      return udr.e173doc.deviceClasses[dc.id][dc.version];
    }
    return null;
  } catch (_e) {
    return null;
  }
}

async function readFileToString(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}
