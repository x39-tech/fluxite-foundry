import JSZip from "jszip";
import {
  Condition,
  DeviceClass,
  E173Archive,
  EmittersStructure as FCEmittersStructure,
  EstaDmx,
  MappingBounds,
  GroupControl,
  MappingRange,
  ParamReference,
  Spd as FCSpd,
  SpdMapping as FCSpdMapping,
  Trigger,
  UnmappedParam,
} from "@cpwg-community/delver";
import { newEntityId } from "app/stateUtils";
import { updateAppPersistentState, useAppPersistentStore } from "app/store";
import {
  buildQualifiedId,
  EntityType,
  getDefaultWindowLayout,
  getUniqueItemId,
  OrgId,
} from "utils/utils";
import {
  importDocumentLocalizations,
  ImportedLocalizationKeys,
} from "features/localizations/localize";
import {
  codexIdAsEntityId,
  commandArgKeyToEditor,
  commandExclusionsToEditor,
  paramExclusionsToEditor,
  resolveCommandId,
  resolveResourceId,
  toEditorParameterReference,
} from "./referenceResolution";
import {
  DEFAULT_SPD_START,
  DEFAULT_SPD_STEP,
  SpdSamples,
} from "./emittersEditor/spd";
import { parseSpdJson } from "./emittersEditor/spdImport";
import {
  Access,
  LocalOrImportedId,
  ClassReference,
  CodexId,
  DeviceClassDocument,
  documentTypes,
  Localization,
  DmxChunkRefCondition,
  DmxConditionGroup,
  DmxConditionParent,
  DmxMapping,
  DmxMappingBounds,
  DmxMappingRange,
  DmxSerializer,
  DmxTrigger,
  DmxUnmappedParam,
  Command,
  EmitterControlGroup,
  EntityId,
  Lifetime,
  LocalizationKey,
  ParameterReference,
  Resource,
  ParameterCount,
  Spd,
  SpdMapping,
} from "app/persistentState";
import {
  EMITTERS_CLASS_CODEX_ID,
  getDefaultDeviceClass,
  INTENSITY_COLOR_LIBRARY,
} from "codex/codex";
import { emptyLibraryIndex, importClasses, LibraryIndex } from "codex/library";
import { assetStorage } from "app/assetStorage";

export interface ArchiveToImport {
  archiveFile: File;
  archive: E173Archive;
}

export async function importDeviceClassEditor(
  orgId: OrgId,
  id: string,
  version: string,
  deviceClass: DeviceClass,
  archive?: ArchiveToImport,
) {
  const newDeviceClass = archive
    ? await getImportedDeviceClassEditorWithAssets(
        orgId,
        id,
        version,
        deviceClass,
        archive,
      )
    : getImportedDeviceClassEditor(orgId, id, version, deviceClass);

  updateAppPersistentState((state) => {
    const newId = newEntityId();
    state.documents[newId] = newDeviceClass;
    state.session.openDocuments.push(newId);
    state.session.layouts[newId] = JSON.stringify(getDefaultWindowLayout());
    state.session.selectedDocumentId = newId;
  });
}

export function getNewDeviceClassEditor(
  existingEditorIds: string[],
  sourceLocale: string,
): DeviceClassDocument {
  // TODO: This only needs to be unique among the same OrgId now
  const deviceClassId = getUniqueItemId(existingEditorIds, "super-light");
  const orgId = useAppPersistentStore.getState().appSettings.orgId;

  return getImportedDeviceClassEditor(
    orgId,
    deviceClassId,
    "1.0.0",
    getDefaultDeviceClass(deviceClassId, sourceLocale),
  );
}

export function getImportedDeviceClassEditor(
  orgId: OrgId,
  id: string,
  version: string,
  codexClass: DeviceClass,
): DeviceClassDocument {
  const localizations: Record<LocalizationKey, Localization> = {};
  const locKeys = importDocumentLocalizations(
    codexClass.localizations,
    localizations,
  );

  const editor: DeviceClassDocument = {
    type: documentTypes.DEVICE_CLASS,
    orgId,
    deviceClassId: id,
    deviceClassVersion: version,
    basicData: {
      publishDate: codexClass.publishDate,
      author: codexClass.author,
      history: codexClass.history,
      manufacturerName: codexClass.info.manufacturer.name,
      manufacturerUrl: codexClass.info.manufacturer.url,
      manufacturerEstaId: codexClass.info.manufacturer.estaId,
      modelName: codexClass.info.model.name,
      modelCategory: codexClass.info.model.category,
      modelSubcategory: codexClass.info.model.subcategory,
      compatibleFirmwareVersions:
        codexClass.info.compatibility?.firmwareVersions,
      localized: {
        description: locKeys.of(codexClass["@description"]),
      },
    },
    libraries: codexClass.libraries,
    parameterClasses: {},
    structureClasses: {},
    serializerClasses: {},
    resourceClasses: {},
    commandClasses: {},
    parameterEditors: [],
    parameters: {},
    resourceEditors: [],
    resources: {},
    resourceAssets: {},
    commandEditors: [],
    commands: {},
    commandClassArguments: {},
    commandClassReturnValues: {},
    enumChoices: {},
    dmxSerializers: {},
    structures: {},
    emitterGroupEditors: [],
    emitterGroups: {},
    emitters: {},
    emitterControlGroups: {},
    localizations,
    sourceLocale: codexClass.locale,
  };

  // This is used only temporarily for the purpose of importing items that
  // reference device library classes, as opposed to the permanent indexes
  // present in ImportedLibrary.
  const deviceLibraryIndex = emptyLibraryIndex();

  importClasses(
    codexClass.deviceLibrary ?? {},
    editor,
    deviceLibraryIndex,
    locKeys.of,
  );
  importParameters(codexClass, editor, deviceLibraryIndex, locKeys);
  importResources(codexClass, editor, deviceLibraryIndex);
  importCommands(codexClass, editor, deviceLibraryIndex, locKeys);
  // After resources: an SPD stored as a resource references one by EntityId.
  importStructures(codexClass, editor, deviceLibraryIndex);

  importDmxSerializers(codexClass, editor);

  return editor;
}

function importParameters(
  imported: DeviceClass,
  editor: DeviceClassDocument,
  classIndex: LibraryIndex,
  locKeys: ImportedLocalizationKeys,
) {
  for (const [id, param] of Object.entries(imported.parameters || {})) {
    const classRef: ClassReference = param.library
      ? {
          type: "imported",
          library: param.library,
          codexId: CodexId(param.class),
        }
      : {
          type: "local",
          id: localClassId(classIndex.parameterClasses, param.class),
        };

    let count: ParameterCount | undefined = undefined;
    if (param.count?.type === "fixed") {
      count = { type: "fixed", value: param.count.value };
    } else if (param.count?.type === "dynamic") {
      count = {
        type: "dynamic",
        min: param.count.value.minimum,
        max: param.count.value.maximum,
      };
    }

    const paramId = newEntityId();
    editor.parameters[paramId] = {
      codexId: CodexId(id),
      class: classRef,
      count,
      access: param.access,
      lifetime: param.lifetime,
      enumExclusions: param.choices?.excluded
        ? paramExclusionsToEditor(
            editor,
            classRef,
            param.choices.excluded.map((c) => CodexId(c)),
          )
        : undefined,
      atomicIdentifier: param.atomicIdentifier,
      minimum: param.minimum,
      maximum: param.maximum,
      minimumModifier: param.minimumModifier,
      maximumModifier: param.maximumModifier,
      default: param.default,
      wrapping: param.looping,
      localized: {
        friendlyName: locKeys.of(param["@friendlyName"]),
      },
    };
    editor.parameterEditors.push(paramId);
    for (const [index, choice] of (param.choices?.additional || []).entries()) {
      const choiceId = newEntityId();
      editor.enumChoices[choiceId] = {
        parent: {
          type: "paramAdditional",
          id: paramId,
        },
        codexId: CodexId(choice.id),
        index,
        localized: {
          name: locKeys.of(choice["@name"]),
          // TODO description
        },
      };
      // TODO description
    }
  }
}

function importResources(
  imported: DeviceClass,
  editor: DeviceClassDocument,
  classIndex: LibraryIndex,
) {
  for (const [id, resource] of Object.entries(imported.resources || {})) {
    const classRef: ClassReference = resource.library
      ? {
          type: "imported",
          library: resource.library,
          codexId: CodexId(resource.class),
        }
      : {
          type: "local",
          id: localClassId(classIndex.resourceClasses, resource.class),
        };

    const resId = newEntityId();
    editor.resources[resId] = {
      codexId: CodexId(id),
      class: classRef,
      access: resource.access,
      lifetime: resource.lifetime,
      mediaType: resource.mediaType,
      assetId: resource.assetId,
      importPath: resource.importPath,
      provenance: resource.provenance,
      default: resource.default,
    };
    editor.resourceEditors.push(resId);
  }
}

function importCommands(
  imported: DeviceClass,
  editor: DeviceClassDocument,
  classIndex: LibraryIndex,
  locKeys: ImportedLocalizationKeys,
) {
  for (const [id, cmd] of Object.entries(imported.commands || {})) {
    const classCodexId = CodexId(cmd.class);
    const localClass = classIndex.commandClasses.get(classCodexId);
    const classRef: ClassReference = cmd.library
      ? {
          type: "imported",
          library: cmd.library,
          codexId: classCodexId,
        }
      : {
          type: "local",
          id: localClassId(classIndex.commandClasses, cmd.class),
        };

    const cmdId = newEntityId();
    const newCmd: Command = {
      codexId: CodexId(id),
      class: classRef,
      completionNotification: cmd.completionNotification,
      localized: {
        friendlyName: locKeys.of(cmd["@friendlyName"]),
      },
    };

    const rawArgExclusions: Record<string, CodexId[]> = {};
    for (const [argId, choices] of Object.entries(cmd.argumentChoices || {})) {
      const argCodexId = CodexId(argId);

      if (choices.excluded) {
        rawArgExclusions[argCodexId] = choices.excluded.map((c) => CodexId(c));
      }
      for (const [index, choice] of (choices.additional || []).entries()) {
        const choiceId = newEntityId();
        editor.enumChoices[choiceId] = {
          parent:
            classRef.type === "local"
              ? {
                  type: "cmdArg",
                  idType: "local",
                  id: localMemberId(
                    classIndex.commandArguments,
                    localClass,
                    argCodexId,
                  ),
                  cmdId,
                }
              : {
                  type: "cmdArg",
                  idType: "imported",
                  id: argCodexId,
                  cmdId,
                },
          codexId: CodexId(choice.id),
          index,
          localized: {
            name: locKeys.of(choice["@name"]),
            // TODO description
          },
        };
        // TODO description
      }
    }
    if (Object.keys(rawArgExclusions).length > 0) {
      newCmd.argEnumExclusions = commandExclusionsToEditor(
        editor,
        classRef,
        "arg",
        rawArgExclusions,
      );
    }

    const rawReturnExclusions: Record<string, CodexId[]> = {};
    for (const [retId, choices] of Object.entries(cmd.returnChoices || {})) {
      const retCodexId = CodexId(retId);

      if (choices.excluded) {
        rawReturnExclusions[retCodexId] = choices.excluded.map((c) =>
          CodexId(c),
        );
      }
      for (const [index, choice] of (choices.additional || []).entries()) {
        const choiceId = newEntityId();
        editor.enumChoices[choiceId] = {
          parent:
            classRef.type === "local"
              ? {
                  type: "cmdRet",
                  idType: "local",
                  id: localMemberId(
                    classIndex.commandReturnValues,
                    localClass,
                    retCodexId,
                  ),
                  cmdId,
                }
              : {
                  type: "cmdRet",
                  idType: "imported",
                  id: retCodexId,
                  cmdId,
                },
          codexId: CodexId(choice.id),
          index,
          localized: {
            name: locKeys.of(choice["@name"]),
            // TODO description
          },
        };
        // TODO description
      }
    }
    if (Object.keys(rawReturnExclusions).length > 0) {
      newCmd.returnEnumExclusions = commandExclusionsToEditor(
        editor,
        classRef,
        "return",
        rawReturnExclusions,
      );
    }

    editor.commands[cmdId] = newCmd;
    editor.commandEditors.push(cmdId);
  }
}

// ---------------------------------------------------------------------------
// Structures
// ---------------------------------------------------------------------------

function importStructures(
  imported: DeviceClass,
  editor: DeviceClassDocument,
  classIndex: LibraryIndex,
) {
  let emittersImported = false;

  for (const [id, structure] of Object.entries(imported.structures || {})) {
    if (structure.type === "Emitters") {
      // TODO: support multiple Emitters structures. A second one is invalid
      // anyway, and the refined type gives us nothing to keep verbatim.
      if (emittersImported) continue;
      emittersImported = true;
      importEmittersStructure(CodexId(id), structure.value, editor, classIndex);
      continue;
    }

    const raw = structure.value;
    editor.structures[newEntityId()] = {
      codexId: CodexId(id),
      class: raw.library
        ? {
            type: "imported",
            library: raw.library,
            codexId: CodexId(raw.class),
          }
        : {
            type: "local",
            id: localClassId(classIndex.structureClasses, raw.class),
          },
      access: raw.access,
      lifetime: raw.lifetime,
      default: raw.default,
    };
  }
}

// The refined EmittersStructure drops the library and class the document named
// them with, so the reference is reconstructed: the device's own library when
// it defines an `emitters` structure class, and the standard library otherwise.
function emittersClassReference(
  classIndex: LibraryIndex,
  codexId: CodexId = EMITTERS_CLASS_CODEX_ID,
): ClassReference {
  const localId = classIndex.structureClasses.get(codexId);
  return localId
    ? { type: "local", id: localId }
    : { type: "imported", library: INTENSITY_COLOR_LIBRARY, codexId };
}

function importEmittersStructure(
  codexId: CodexId,
  structure: FCEmittersStructure,
  editor: DeviceClassDocument,
  classIndex: LibraryIndex,
) {
  editor.emittersStructure = {
    codexId,
    class: emittersClassReference(classIndex),
    access: structure.access,
    lifetime: structure.lifetime,
  };

  if (!structure.default) return;

  const groupIds = new Map<string, EntityId>();

  for (const [groupCodexId, group] of Object.entries(
    structure.default.emitterGroups,
  )) {
    const groupId = newEntityId();
    groupIds.set(groupCodexId, groupId);
    editor.emitterGroups[groupId] = {
      codexId: CodexId(groupCodexId),
      emitters: [],
    };
    editor.emitterGroupEditors.push(groupId);

    for (const [emitterCodexId, emitter] of Object.entries(group.emitters)) {
      const emitterId = newEntityId();
      editor.emitters[emitterId] = {
        codexId: CodexId(emitterCodexId),
        directControl: toEditorParamRef(editor, emitter.directControl),
        commonColor: emitter.commonColor,
        relativeBrightness: emitter.relativeBrightness,
        spd: emitter.spd ? toEditorSpd(editor, emitter.spd) : undefined,
      };
      editor.emitterGroups[groupId].emitters.push(emitterId);
    }
  }

  for (const [controlCodexId, control] of Object.entries(
    structure.default.controlGroups ?? {},
  )) {
    editor.emitterControlGroups[newEntityId()] = toEditorControlGroup(
      editor,
      CodexId(controlCodexId),
      control,
      groupIds,
    );
  }
}

function toEditorParamRef(
  editor: DeviceClassDocument,
  ref: ParamReference,
): ParameterReference;
function toEditorParamRef(
  editor: DeviceClassDocument,
  ref: ParamReference | undefined,
): ParameterReference | undefined;
function toEditorParamRef(
  editor: DeviceClassDocument,
  ref: ParamReference | undefined,
): ParameterReference | undefined {
  return ref
    ? toEditorParameterReference(editor, CodexId(ref.id), ref.index)
    : undefined;
}

function toEditorSpd(editor: DeviceClassDocument, spd: FCSpd): Spd {
  if ("direct" in spd) {
    return {
      storage: { type: "inline" },
      start: spd.direct.start,
      step: spd.direct.step,
      mappings: spd.direct.mappings.map(toEditorSpdMapping),
    };
  }

  // The samples live in the resource's file, which is only available from an
  // archive. hydrateResourceBackedSpds fills them in when there is one.
  return {
    storage: {
      type: "resource",
      resourceId: resolveResourceId(editor, CodexId(spd.local)),
      remote: spd.remote,
    },
    start: DEFAULT_SPD_START,
    step: DEFAULT_SPD_STEP,
    mappings: [],
  };
}

function toEditorSpdMapping(mapping: FCSpdMapping): SpdMapping {
  return {
    value: mapping.value,
    powerDistribution: mapping.powerDistribution,
    deviationPlus: mapping.deviationPlus,
    deviationMinus: mapping.deviationMinus,
  };
}

function toEditorControlGroup(
  editor: DeviceClassDocument,
  codexId: CodexId,
  control: GroupControl,
  groupIds: Map<string, EntityId>,
): EmitterControlGroup {
  const ref = (r: ParamReference) => toEditorParamRef(editor, r);

  return {
    codexId,
    emitterGroups: control.emitterGroups.map(
      (group) => groupIds.get(group) ?? codexIdAsEntityId(group),
    ),
    masterIntensity: toEditorParamRef(editor, control.masterIntensity),
    rgb: control.rgb && {
      red: ref(control.rgb.red),
      green: ref(control.rgb.green),
      blue: ref(control.rgb.blue),
    },
    hsv: control.hsv && {
      hue: ref(control.hsv.hue),
      saturation: ref(control.hsv.saturation),
      value: ref(control.hsv.value),
    },
    cct: control.cct && {
      cct: ref(control.cct.cct),
      tint: ref(control.cct.tint),
    },
    cmy: control.cmy && {
      cyan: ref(control.cmy.cyan),
      magenta: ref(control.cmy.magenta),
      yellow: ref(control.cmy.yellow),
    },
    xy: control.xy && {
      x: ref(control.xy.x),
      y: ref(control.xy.y),
    },
    xyz: control.xyz && {
      x: ref(control.xyz.x),
      y: ref(control.xyz.y),
      z: ref(control.xyz.z),
    },
    uv: control.uv && {
      u: ref(control.uv.u),
      v: ref(control.uv.v),
    },
    crossfade: control.crossfade && {
      parameter: ref(control.crossfade.parameter),
      points: control.crossfade.points.map((point) => ({
        value: point.value,
        controlScheme: point.controlScheme,
      })),
    },
  };
}

/**
 * Reads the samples of every resource-backed SPD out of the archive's assets.
 *
 * The resource holds nothing afterwards: the file is regenerated from state on
 * export, so keeping the imported copy around would only let the two disagree.
 * A document imported without an archive, or one whose file is missing or
 * unparseable, keeps an SPD with no mappings, which the editor reports.
 */
export async function hydrateResourceBackedSpds(editor: DeviceClassDocument) {
  for (const emitter of Object.values(editor.emitters)) {
    const spd = emitter.spd;
    if (spd?.storage.type !== "resource") continue;

    const resource = editor.resources[spd.storage.resourceId];
    if (!resource?.default) continue;

    const assetId = editor.resourceAssets[resource.default];
    const samples = assetId ? await readSpdAsset(assetId) : undefined;
    if (samples) {
      spd.start = samples.start;
      spd.step = samples.step;
      spd.mappings = samples.mappings;
    }

    delete editor.resourceAssets[resource.default];
    resource.default = undefined;
  }
}

async function readSpdAsset(assetId: string): Promise<SpdSamples | undefined> {
  try {
    const asset = await assetStorage.getAsset(assetId);
    if (!asset) return undefined;
    const parsed = parseSpdJson(new TextDecoder().decode(asset.data));
    return parsed.ok ? parsed.samples : undefined;
  } catch (_e) {
    return undefined;
  }
}

// Resolves a codexId the document uses to reference one of its own classes to
// the EntityId the class was imported under. A broken reference just uses the
// codexId as an EntityId, which is the app-wide pattern.
function localClassId(
  classIndex: Map<CodexId, EntityId>,
  codexId: string,
): EntityId {
  return classIndex.get(CodexId(codexId)) ?? codexIdAsEntityId(codexId);
}

function localMemberId(
  memberIndex: Map<EntityId, Map<CodexId, EntityId>>,
  ownerId: EntityId | undefined,
  codexId: CodexId,
): EntityId {
  const id = ownerId && memberIndex.get(ownerId)?.get(codexId);
  return id ?? codexIdAsEntityId(codexId);
}

async function getImportedDeviceClassEditorWithAssets(
  orgId: OrgId,
  id: string,
  version: string,
  deviceClass: DeviceClass,
  archive: ArchiveToImport,
) {
  const editor = getImportedDeviceClassEditor(orgId, id, version, deviceClass);

  const qualifiedId = buildQualifiedId(EntityType.Dev, orgId, id);
  editor.resourceAssets = await loadResourceAssets(
    qualifiedId,
    version,
    archive,
    editor.resources,
  );
  await hydrateResourceBackedSpds(editor);
  return editor;
}

async function loadResourceAssets(
  qualifiedId: string,
  version: string,
  archive: ArchiveToImport,
  resources: Record<string, Resource>,
): Promise<Record<string, string>> {
  const resourceAssets: Record<string, string> = {};

  let zip;
  try {
    zip = await JSZip.loadAsync(archive.archiveFile);
  } catch (_e) {
    return resourceAssets;
  }

  const assetsDir =
    archive.archive.e173archive.deviceClasses?.[qualifiedId]?.[version]
      ?.assetsDirectory;
  if (!assetsDir) {
    return resourceAssets;
  }

  for (const resource of Object.values(resources)) {
    if (resource.default) {
      try {
        const filePath = `${assetsDir}/${resource.default}`;

        const zipFile = zip.file(filePath);
        if (!zipFile) {
          throw new Error("Resource file did not exist in archive");
        }

        const fileContent = await zipFile.async("arraybuffer");
        const assetId = await assetStorage.storeAsset(
          fileContent,
          resource.mediaType,
        );
        resourceAssets[resource.default] = assetId;
      } catch (_e) {
        // TODO error handling
        continue;
      }
    }
  }

  return resourceAssets;
}

// ---------------------------------------------------------------------------
// DMX Conversion
// ---------------------------------------------------------------------------

function importDmxSerializers(
  imported: DeviceClass,
  editor: DeviceClassDocument,
) {
  for (const [codexId, serializer] of Object.entries(
    imported.serializers ?? {},
  )) {
    if (serializer.type !== "EstaDmx") {
      continue;
    }

    const { access, lifetime, default: estaDmx } = serializer.value;
    editor.dmxSerializers[newEntityId()] = convertEstaDmxToEditorState(
      editor,
      CodexId(codexId),
      access,
      lifetime,
      estaDmx ?? { chunks: {} },
    );
  }
}

function convertEstaDmxToEditorState(
  editor: DeviceClassDocument,
  codexId: CodexId,
  access: Access[],
  lifetime: Lifetime,
  estaDmx: EstaDmx,
): DmxSerializer {
  const result: DmxSerializer = {
    codexId,
    access,
    lifetime,
    chunks: {},
    mappingGroups: {},
    conditions: {},
  };

  // Build a map from old chunk IDs to new EntityIds
  // IMPORTANT: Build the entire map first before processing any conditions,
  // to avoid forward reference issues where conditions reference chunks
  // that haven't been added to the map yet.
  const chunkIdMap: Record<string, EntityId> = {};

  // First pass: Create all chunks and build the ID map
  for (const [oldChunkId, chunk] of Object.entries(estaDmx.chunks)) {
    const newChunkId = newEntityId();
    chunkIdMap[oldChunkId] = newChunkId;

    result.chunks[newChunkId] = {
      offsets: chunk.offsets,
    };
  }

  // Second pass: Process mapping groups and conditions
  // Now all chunks are in the map, so conditions can safely reference them
  for (const [oldChunkId, chunk] of Object.entries(estaDmx.chunks)) {
    const newChunkId = chunkIdMap[oldChunkId];

    // Convert mapping groups for this chunk
    chunk.mappingGroups.forEach((mg, index) => {
      const mappingGroupId = newEntityId();
      result.mappingGroups[mappingGroupId] = {
        chunkId: newChunkId,
        index,
        mappings: (mg.mappings ?? []).map((m) => convertMapping(editor, m)),
        triggers: (mg.triggers ?? []).map((t) => convertTrigger(editor, t)),
      };

      // Convert conditions for this mapping group
      if (mg.conditions && mg.conditions.length > 0) {
        convertConditionsToNormalized(
          mg.conditions,
          { type: "mappingGroup", id: mappingGroupId },
          chunkIdMap,
          result,
        );
      }
    });
  }

  return result;
}

function convertConditionsToNormalized(
  conditions: Condition[],
  parent: DmxConditionParent,
  chunkIdMap: Record<string, EntityId>,
  result: DmxSerializer,
) {
  for (const condition of conditions) {
    if (condition.type === "group") {
      // This is a group condition
      const groupConditionId = newEntityId();
      const groupCondition: DmxConditionGroup = {
        conditionType: "group",
        parent,
        match: condition.value.condMatch,
      };
      result.conditions[groupConditionId] = groupCondition;

      // Recursively convert child conditions
      convertConditionsToNormalized(
        condition.value.conditions,
        { type: "condition", id: groupConditionId },
        chunkIdMap,
        result,
      );
    } else if (condition.type === "simple") {
      // This is a chunk reference condition
      const chunkRefConditionId = newEntityId();
      const referencedChunkId = chunkIdMap[condition.value.chunk];

      if (!referencedChunkId) {
        throw new Error(
          `Chunk reference condition references non-existent chunk: "${condition.value.chunk}". Available chunks: ${Object.keys(chunkIdMap).join(", ")}`,
        );
      }

      const chunkRefCondition: DmxChunkRefCondition = {
        conditionType: "chunkRef",
        parent,
        chunkId: referencedChunkId,
        chunkStart: condition.value.chunkStart,
        chunkEnd: condition.value.chunkEnd,
      };
      result.conditions[chunkRefConditionId] = chunkRefCondition;
    }
  }
}

function convertMapping(
  editor: DeviceClassDocument,
  m: {
    mappedParam: { id: string; index?: number };
    ranges: MappingRange[];
    unmappedParams?: UnmappedParam[];
  },
): DmxMapping {
  return {
    mappedParam: toEditorParameterReference(
      editor,
      CodexId(m.mappedParam.id),
      m.mappedParam.index,
    ),
    ranges: m.ranges.map(convertMappingRange),
    unmappedParams: m.unmappedParams?.map((up) =>
      convertUnmappedParam(editor, up),
    ),
  };
}

function convertMappingBounds(bounds: MappingBounds): DmxMappingBounds {
  switch (bounds.type) {
    case "null":
      return bounds;
    case "numeric":
      return { type: "numeric", ...bounds.value };
    case "bool":
      return { type: "bool", ...bounds.value };
  }
}

function convertMappingRange(r: MappingRange): DmxMappingRange {
  return {
    bounds: convertMappingBounds(r.bounds),
    chunkValues:
      r.chunkValues.type === "range"
        ? {
            type: "range",
            chunkStart: r.chunkValues.value.start,
            chunkEnd: r.chunkValues.value.end,
          }
        : {
            type: "sequence",
            steps: r.chunkValues.value.map((step) => ({
              chunkStart: step.chunkStart,
              chunkEnd: step.chunkEnd,
              hold: step.hold,
            })),
          },
  };
}

function convertUnmappedParam(
  editor: DeviceClassDocument,
  up: UnmappedParam,
): DmxUnmappedParam {
  return {
    parameter: toEditorParameterReference(
      editor,
      CodexId(up.parameter.id),
      up.parameter.index,
    ),
    bounds: convertMappingBounds(up.bounds),
  };
}

function convertTrigger(editor: DeviceClassDocument, t: Trigger): DmxTrigger {
  const commandId = resolveCommandId(editor, CodexId(t.command));
  const command = editor.commands[commandId];

  return {
    command: commandId,
    mappings: t.mappings.map((tm) => ({
      conditions: Object.fromEntries(
        Object.entries(tm.conditions ?? {}).map(([key, cond]) => [
          // Condition keys are argument codexIds in the codex format. Store
          // them as EntityIds when the command's class is local.
          command
            ? commandArgKeyToEditor(editor, command.class, CodexId(key))
            : (CodexId(key) as LocalOrImportedId),
          {
            argumentMin: cond.argumentMin,
            argumentMax: cond.argumentMax,
          },
        ]),
      ),
      sequence: tm.sequence.map((step) => ({
        chunkStart: step.chunkStart,
        chunkEnd: step.chunkEnd,
        hold: step.hold,
      })),
    })),
  };
}
