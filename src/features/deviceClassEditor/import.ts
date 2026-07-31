import JSZip from "jszip";
import {
  Condition,
  DeviceClass,
  E173Archive,
  EstaDmx,
  MappingRange,
  Trigger,
  UnmappedParam,
} from "@cpwg-community/delver";
import { newEntityId, optionalLocalizationKey } from "app/stateUtils";
import { updateAppPersistentState, useAppPersistentStore } from "app/store";
import {
  buildQualifiedId,
  EntityType,
  getDefaultWindowLayout,
  getUniqueItemId,
  OrgId,
} from "utils/utils";
import { importLocalizations } from "utils/localizationUtils";
import { updateDmxController } from "./state";
import {
  codexIdAsEntityId,
  commandArgKeyToEditor,
  commandExclusionsToEditor,
  paramExclusionsToEditor,
  resolveCommandId,
  toEditorParameterReference,
} from "./referenceResolution";
import {
  LocalOrImportedId,
  ClassReference,
  CodexId,
  DeviceClassEditorState,
  DmxChunkRefCondition,
  DmxConditionGroup,
  DmxConditionParent,
  DmxMapping,
  DmxMappingRange,
  DmxSerializerState,
  DmxTrigger,
  DmxUnmappedParam,
  Command,
  EntityId,
  LocalizationDbSchema,
  LocalizationKey,
  LocalizationReferencedItem,
  Resource,
  ParameterCount,
} from "app/persistentState";
import { getDefaultDeviceClass } from "codex/codex";
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
    const deviceClassEditors = state.deviceClassEditors;
    const openEditors = state.openEditors;

    const newId = newEntityId();
    deviceClassEditors[newId] = newDeviceClass;
    openEditors.editors.push({ type: "deviceClass", id: newId });
    openEditors.selectedEditor = openEditors.editors.length - 1;

    updateDmxController(deviceClassEditors[newId]);
  });
}

export function getNewDeviceClassEditor(
  existingEditorIds: string[],
): DeviceClassEditorState {
  // TODO: This only needs to be unique among the same OrgId now
  const deviceClassId = getUniqueItemId(existingEditorIds, "super-light");
  const orgId = useAppPersistentStore.getState().appSettings.orgId;

  return getImportedDeviceClassEditor(
    orgId,
    deviceClassId,
    "1.0.0",
    getDefaultDeviceClass(deviceClassId),
  );
}

export function getImportedDeviceClassEditor(
  orgId: OrgId,
  id: string,
  version: string,
  codexClass: DeviceClass,
): DeviceClassEditorState {
  let dmx: EstaDmx | undefined = undefined;

  // TODO: support multiple DMX serializers
  if (codexClass.serializers) {
    for (const value of Object.values(codexClass.serializers ?? {})) {
      if (value.type === "EstaDmx" && value.value.default)
        dmx = value.value.default;
    }
  }

  const editor: DeviceClassEditorState = {
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
        description: LocalizationKey(codexClass["@description"]),
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
    localizations: {},
    windowLayout: JSON.stringify(getDefaultWindowLayout()),
  };

  // This is used only temporarily for the purpose of importing items that
  // reference device library classes, as opposed to the permanent indexes
  // present in ImportedLibrary.
  const deviceLibraryIndex = emptyLibraryIndex();

  importLocalizations(codexClass.localizations, editor.localizations, () => ({
    strings: LocalizationDbSchema.parse({}),
    items: [],
  }));
  importClasses(
    codexClass.deviceLibrary ?? {},
    editor,
    deviceLibraryIndex,
    (itemId, itemType, locKey) =>
      addLocalizationReference(itemId, itemType, locKey, editor),
  );
  importParameters(codexClass, editor, deviceLibraryIndex);
  importResources(codexClass, editor, deviceLibraryIndex);
  importCommands(codexClass, editor, deviceLibraryIndex);

  if (dmx) {
    editor.dmxSerializer = convertEstaDmxToEditorState(editor, dmx);
  }

  return editor;
}

function importParameters(
  imported: DeviceClass,
  editor: DeviceClassEditorState,
  classIndex: LibraryIndex,
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
        friendlyName: optionalLocalizationKey(param["@friendlyName"]),
      },
    };
    editor.parameterEditors.push(paramId);

    addLocalizationReference(
      paramId,
      "paramName",
      param["@friendlyName"],
      editor,
    );

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
          name: LocalizationKey(choice["@name"]),
          // TODO description
        },
      };
      addLocalizationReference(choiceId, "enumName", choice["@name"], editor);
      // TODO description
    }
  }
}

function importResources(
  imported: DeviceClass,
  editor: DeviceClassEditorState,
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
  editor: DeviceClassEditorState,
  classIndex: LibraryIndex,
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
        friendlyName: optionalLocalizationKey(cmd["@friendlyName"]),
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
            name: LocalizationKey(choice["@name"]),
            // TODO description
          },
        };
        addLocalizationReference(choiceId, "enumName", choice["@name"], editor);
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
            name: LocalizationKey(choice["@name"]),
            // TODO description
          },
        };
        addLocalizationReference(choiceId, "enumName", choice["@name"], editor);
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
    addLocalizationReference(cmdId, "cmdName", cmd["@friendlyName"], editor);
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

function addLocalizationReference(
  itemId: EntityId,
  itemType: LocalizationReferencedItem["itemType"],
  locKey: string | undefined,
  editor: DeviceClassEditorState,
) {
  if (!locKey) {
    return;
  }

  const locDb = editor.localizations[LocalizationKey(locKey)];
  if (!locDb) {
    return;
  }

  locDb.items.push({
    itemId,
    itemType,
  });
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

function convertEstaDmxToEditorState(
  editor: DeviceClassEditorState,
  estaDmx: EstaDmx,
): DmxSerializerState {
  const result: DmxSerializerState = {
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
  result: DmxSerializerState,
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
  editor: DeviceClassEditorState,
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

function convertMappingRange(r: MappingRange): DmxMappingRange {
  return {
    start: r.start,
    end: r.end,
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
  editor: DeviceClassEditorState,
  up: UnmappedParam,
): DmxUnmappedParam {
  return {
    parameter: toEditorParameterReference(
      editor,
      CodexId(up.parameter.id),
      up.parameter.index,
    ),
    start: up.start,
    end: up.end,
  };
}

function convertTrigger(
  editor: DeviceClassEditorState,
  t: Trigger,
): DmxTrigger {
  const commandId = resolveCommandId(editor, CodexId(t.command));
  const command = editor.commands[commandId];

  return {
    command: commandId,
    mappings: t.mappings.map((tm) => ({
      conditions: Object.fromEntries(
        Object.entries(tm.conditions).map(([key, cond]) => [
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
