import {
  Access,
  ChunkValues,
  Command,
  CommandClass,
  Condition,
  DataType,
  DefinitionLocalization,
  DeviceClass,
  EstaDmx,
  Lifetime,
  Parameter,
  ParameterAccess,
  ParameterClass,
  ParameterCount,
  ParamReference as FCParamReference,
  Resource,
  ResourceClass,
  SerializerClass,
  StructureClass,
  Trigger,
  UnitName,
} from "@cpwg-community/delver";
import {
  LocalOrImportedId,
  DeviceClassDocument,
  DmxChunkRefCondition,
  DmxConditionGroup,
  DmxMappingChunkValuesSchema,
  DmxSerializerState,
  DmxTrigger,
  EntityId,
  ParameterCountSchema,
  ParameterReference,
} from "app/persistentState";
import { select, selectWithIds } from "app/stateUtils";
import {
  classReferenceCodexId,
  commandArgKeyToCodex,
  entityIdAsCodexId,
  commandExclusionsToCodex,
  commandCurrentCodexId,
  paramExclusionsToCodex,
  parameterCurrentCodexId,
} from "./referenceResolution";
import { z } from "zod";

type InternalParameterCount = z.infer<typeof ParameterCountSchema>;

function convertParamReference(
  editor: DeviceClassDocument,
  ref: ParameterReference,
): FCParamReference {
  return {
    id: parameterCurrentCodexId(editor, ref),
    index: ref.index,
  };
}

function convertTrigger(
  editor: DeviceClassDocument,
  trigger: DmxTrigger,
): Trigger {
  const command = editor.commands[trigger.command];
  const commandCodexId = commandCurrentCodexId(editor, trigger.command);

  return {
    command: commandCodexId,
    mappings: trigger.mappings.map((tm) => ({
      conditions: Object.fromEntries(
        Object.entries(tm.conditions).map(([key, cond]) => [
          // Condition keys are argument member ids in the command's class ID
          // space. Resolve back to the Codex codexId when the class is local.
          command
            ? commandArgKeyToCodex(
                editor,
                command.class,
                key as LocalOrImportedId,
              )
            : key,
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

function convertParameterCount(
  count: InternalParameterCount | undefined,
): ParameterCount | undefined {
  if (!count) return undefined;
  if (count.type === "fixed") {
    return { type: "fixed", value: count.value };
  }
  return {
    type: "dynamic",
    value: { minimum: count.min, maximum: count.max },
  };
}

function convertChunkValues(
  chunkValues: z.infer<typeof DmxMappingChunkValuesSchema>,
): ChunkValues {
  if (chunkValues.type === "range") {
    return {
      type: "range",
      value: { start: chunkValues.chunkStart, end: chunkValues.chunkEnd },
    };
  }
  return {
    type: "sequence",
    value: chunkValues.steps.map((step) => ({
      chunkStart: step.chunkStart,
      chunkEnd: step.chunkEnd,
      hold:
        step.hold === "indefinite"
          ? "indefinite"
          : { milliseconds: step.hold.milliseconds },
    })),
  };
}

export function exportDeviceClass(editor: DeviceClassDocument): DeviceClass {
  const codexClass: DeviceClass = {
    "@description": editor.basicData.localized.description,
    publishDate: editor.basicData.publishDate,
    author: editor.basicData.author,
    history: editor.basicData.history,
    info: {
      manufacturer: {
        name: editor.basicData.manufacturerName,
        url: editor.basicData.manufacturerUrl,
        estaId: editor.basicData.manufacturerEstaId,
      },
      model: {
        name: editor.basicData.modelName,
        category: editor.basicData.modelCategory,
        subcategory: editor.basicData.modelSubcategory,
      },
      compatibility: {
        firmwareVersions: editor.basicData.compatibleFirmwareVersions,
      },
    },
    libraries: editor.libraries,
  };

  exportLocalizations(editor, codexClass);
  exportParameterClasses(editor, codexClass);
  exportStructureClasses(editor, codexClass);
  exportSerializerClasses(editor, codexClass);
  exportResourceClasses(editor, codexClass);
  exportCommandClasses(editor, codexClass);
  exportParameters(editor, codexClass);
  exportResources(editor, codexClass);
  exportCommands(editor, codexClass);
  exportDmxSerializer(editor, codexClass);

  return codexClass;
}

function exportLocalizations(
  editor: DeviceClassDocument,
  codexClass: DeviceClass,
) {
  if (Object.keys(editor.localizations).length === 0) {
    return;
  }

  codexClass.localizations = Object.entries(editor.localizations).reduce(
    (acc, [locKey, locDb]) => {
      for (const [lang, locStr] of Object.entries(locDb.strings)) {
        acc[lang] ??= {};
        acc[lang].strings ??= {};
        acc[lang].strings[locKey] = locStr;
      }
      return acc;
    },
    {} as Record<string, DefinitionLocalization>,
  );
}

function exportParameterClasses(
  editor: DeviceClassDocument,
  codexClass: DeviceClass,
) {
  if (
    !editor.parameterClasses ||
    Object.keys(editor.parameterClasses).length === 0
  ) {
    return;
  }

  codexClass.deviceLibrary ??= {};

  codexClass.deviceLibrary.parameterClasses = Object.entries(
    editor.parameterClasses,
  ).reduce(
    (acc, [paramClassId, paramClass]) => {
      if (paramClass.codexId in acc) {
        throw new Error(`Duplicate parameter class ID: ${paramClassId}`);
      }

      const exportedParamClass: ParameterClass = {
        "@name": paramClass.localized.name,
        "@description": paramClass.localized.description,
        dataType: paramClass.dataType as DataType,
        unit: paramClass.unit
          ? {
              name: paramClass.unit.name as UnitName,
              exponent: paramClass.unit.exponent,
            }
          : undefined,
      };

      if (paramClass.dataType === "enum") {
        const choices = select(
          editor.enumChoices,
          (choice) =>
            choice.parent.type === "paramClass" &&
            choice.parent.id === paramClassId,
        );

        if (choices.length > 0) {
          choices.sort((a, b) => a.index - b.index);
          exportedParamClass.choices = choices.map((choice) => {
            return {
              id: choice.codexId,
              "@name": choice.localized.name,
              // TODO: description
            };
          });
        }
      }

      acc[paramClass.codexId] = exportedParamClass;
      return acc;
    },
    {} as Record<string, ParameterClass>,
  );
}

function exportStructureClasses(
  editor: DeviceClassDocument,
  codexClass: DeviceClass,
) {
  if (Object.keys(editor.structureClasses).length === 0) {
    return;
  }

  codexClass.deviceLibrary ??= {};

  codexClass.deviceLibrary.structureClasses = Object.entries(
    editor.structureClasses,
  ).reduce(
    (acc, [structClassId, structClass]) => {
      if (structClass.codexId in acc) {
        throw new Error(`Duplicate structure class ID: ${structClassId}`);
      }

      const exportedStructClass: StructureClass = {
        "@name": structClass.localized.name,
        "@description": structClass.localized.description,
        multipleAllowed: structClass.multipleAllowed,
      };

      acc[structClass.codexId] = exportedStructClass;
      return acc;
    },
    {} as Record<string, StructureClass>,
  );
}

function exportSerializerClasses(
  editor: DeviceClassDocument,
  codexClass: DeviceClass,
) {
  if (Object.keys(editor.serializerClasses).length === 0) {
    return;
  }

  codexClass.deviceLibrary ??= {};

  codexClass.deviceLibrary.serializerClasses = Object.entries(
    editor.serializerClasses,
  ).reduce(
    (acc, [serClassId, serClass]) => {
      if (serClass.codexId in acc) {
        throw new Error(`Duplicate serializer class ID: ${serClassId}`);
      }

      const exportedSerClass: SerializerClass = {
        "@name": serClass.localized.name,
        "@description": serClass.localized.description,
      };

      acc[serClass.codexId] = exportedSerClass;
      return acc;
    },
    {} as Record<string, SerializerClass>,
  );
}

function exportResourceClasses(
  editor: DeviceClassDocument,
  codexClass: DeviceClass,
) {
  if (Object.keys(editor.resourceClasses).length === 0) {
    return;
  }

  codexClass.deviceLibrary ??= {};

  codexClass.deviceLibrary.resourceClasses = Object.entries(
    editor.resourceClasses,
  ).reduce(
    (acc, [resClassId, resClass]) => {
      if (resClass.codexId in acc) {
        throw new Error(`Duplicate resource class ID: ${resClassId}`);
      }

      const exportedResClass: ResourceClass = {
        "@name": resClass.localized.name,
        "@description": resClass.localized.description,
        mediaType: resClass.mediaType,
      };

      acc[resClass.codexId] = exportedResClass;
      return acc;
    },
    {} as Record<string, ResourceClass>,
  );
}

function exportCommandClasses(
  editor: DeviceClassDocument,
  codexClass: DeviceClass,
) {
  if (Object.keys(editor.commandClasses).length === 0) {
    return;
  }

  codexClass.deviceLibrary ??= {};

  codexClass.deviceLibrary.commandClasses = Object.entries(
    editor.commandClasses,
  ).reduce(
    (acc, [cmdClassId, cmdClass]) => {
      if (cmdClass.codexId in acc) {
        throw new Error(`Duplicate command class ID: ${cmdClassId}`);
      }

      const exportedCmdClass: CommandClass = {
        "@name": cmdClass.localized.name,
        "@description": cmdClass.localized.description,
      };

      // Export arguments
      const args = selectWithIds(
        editor.commandClassArguments,
        (arg) => arg.parentId === cmdClassId,
      );

      if (args.length > 0) {
        exportedCmdClass.arguments = {};
        for (const arg of args) {
          if (arg.codexId in exportedCmdClass.arguments) {
            throw new Error(
              `Duplicate argument codex ID: ${arg.codexId} in command class ID: ${cmdClass.codexId} (${cmdClassId})`,
            );
          }

          exportedCmdClass.arguments[arg.codexId] = {
            "@name": arg.localized.name,
            "@description": arg.localized.description,
            dataType: arg.dataType as DataType,
            unit: arg.unit
              ? {
                  name: arg.unit.name as UnitName,
                  exponent: arg.unit.exponent,
                }
              : undefined,
            required: arg.required,
          };

          // Export enum choices for this argument
          if (arg.dataType === "enum") {
            const choices = select(
              editor.enumChoices,
              (choice) =>
                choice.parent.type === "cmdClassArg" &&
                choice.parent.id === arg.id,
            );

            if (choices.length > 0) {
              choices.sort((a, b) => a.index - b.index);
              exportedCmdClass.arguments[arg.codexId].choices = choices.map(
                (choice) => ({
                  id: choice.codexId,
                  "@name": choice.localized.name,
                  // TODO: description
                }),
              );
            }
          }
        }
      }

      // Export return values
      const returns = selectWithIds(
        editor.commandClassReturnValues,
        (ret) => ret.parentId === cmdClassId,
      );

      if (returns.length > 0) {
        exportedCmdClass.returns = {};
        for (const ret of returns) {
          exportedCmdClass.returns[ret.codexId] = {
            "@name": ret.localized.name,
            "@description": ret.localized.description,
            dataType: ret.dataType as DataType,
            unit: ret.unit
              ? {
                  name: ret.unit.name as UnitName,
                  exponent: ret.unit.exponent,
                }
              : undefined,
            required: ret.required,
          };

          // Export enum choices for this return value
          if (ret.dataType === "enum") {
            const choices = select(
              editor.enumChoices,
              (choice) =>
                choice.parent.type === "cmdClassRet" &&
                choice.parent.id === ret.id,
            );

            if (choices.length > 0) {
              choices.sort((a, b) => a.index - b.index);
              exportedCmdClass.returns[ret.codexId].choices = choices.map(
                (choice) => ({
                  id: choice.codexId,
                  "@name": choice.localized.name,
                  // TODO: description
                }),
              );
            }
          }
        }
      }

      acc[cmdClass.codexId] = exportedCmdClass;
      return acc;
    },
    {} as Record<string, CommandClass>,
  );
}

function exportParameters(
  editor: DeviceClassDocument,
  codexClass: DeviceClass,
) {
  if (Object.keys(editor.parameters).length === 0) {
    return;
  }

  codexClass.parameters = {};

  for (const [paramId, param] of Object.entries(editor.parameters)) {
    if (param.codexId in codexClass.parameters) {
      throw new Error(`Duplicate parameter ID: ${param.codexId}`);
    }

    const exportedParam: Parameter = {
      class: classReferenceCodexId(param.class, editor.parameterClasses),
      library:
        param.class.type === "imported" ? param.class.library : undefined,
      access: param.access as ParameterAccess[],
      lifetime: param.lifetime as Lifetime,
      "@friendlyName": param.localized.friendlyName,
      count: convertParameterCount(param.count),
      atomicIdentifier: param.atomicIdentifier,
      minimum: param.minimum,
      maximum: param.maximum,
      minimumModifier: param.minimumModifier,
      maximumModifier: param.maximumModifier,
      default: param.default,
      looping: param.wrapping,
    };

    // Handle enum choices (excluded and additional)
    const additionalChoices = select(
      editor.enumChoices,
      (choice) =>
        choice.parent.type === "paramAdditional" &&
        choice.parent.id === paramId,
    );

    if (param.enumExclusions || additionalChoices.length > 0) {
      exportedParam.choices = {};

      if (param.enumExclusions) {
        exportedParam.choices.excluded = paramExclusionsToCodex(
          editor,
          param.class,
          param.enumExclusions,
        );
      }

      if (additionalChoices.length > 0) {
        additionalChoices.sort((a, b) => a.index - b.index);
        exportedParam.choices.additional = additionalChoices.map((choice) => ({
          id: choice.codexId,
          "@name": choice.localized.name,
          // TODO: description
        }));
      }
    }

    codexClass.parameters[param.codexId] = exportedParam;
  }
}

function exportResources(editor: DeviceClassDocument, codexClass: DeviceClass) {
  if (Object.keys(editor.resources).length === 0) {
    return;
  }

  codexClass.resources = {};

  for (const resource of Object.values(editor.resources)) {
    if (resource.codexId in codexClass.resources) {
      throw new Error(`Duplicate resource ID: ${resource.codexId}`);
    }

    const exportedResource: Resource = {
      class: classReferenceCodexId(resource.class, editor.resourceClasses),
      library:
        resource.class.type === "imported" ? resource.class.library : undefined,
      access: resource.access as Access[],
      lifetime: resource.lifetime as Lifetime,
      mediaType: resource.mediaType,
      assetId: resource.assetId,
      importPath: resource.importPath,
      provenance: resource.provenance,
      default: resource.default,
    };

    codexClass.resources[resource.codexId] = exportedResource;
  }
}

function exportCommands(editor: DeviceClassDocument, codexClass: DeviceClass) {
  if (Object.keys(editor.commands).length === 0) {
    return;
  }

  codexClass.commands = {};

  for (const [cmdId, cmd] of Object.entries(editor.commands)) {
    if (cmd.codexId in codexClass.commands) {
      throw new Error(`Duplicate command ID: ${cmd.codexId}`);
    }

    const exportedCmd: Command = {
      class: classReferenceCodexId(cmd.class, editor.commandClasses),
      library: cmd.class.type === "imported" ? cmd.class.library : undefined,
      completionNotification: cmd.completionNotification,
      "@friendlyName": cmd.localized.friendlyName,
    };

    // Handle argument choices (excluded and additional)
    if (cmd.argEnumExclusions) {
      exportedCmd.argumentChoices = {};
      const codexExclusions = commandExclusionsToCodex(
        editor,
        cmd.class,
        "arg",
        cmd.argEnumExclusions,
      );
      for (const [argCodexId, excluded] of Object.entries(codexExclusions)) {
        exportedCmd.argumentChoices[argCodexId] = {
          excluded,
        };
      }
    }

    // Find additional enum choices for command arguments
    const argAdditionalChoices = select(
      editor.enumChoices,
      (choice) =>
        choice.parent.type === "cmdArg" &&
        "cmdId" in choice.parent &&
        choice.parent.cmdId === cmdId,
    );

    // Group additional choices by argument codex ID
    if (argAdditionalChoices.length > 0) {
      exportedCmd.argumentChoices ||= {};

      // Group by parent ID (which is the argument ID for local or codexId for imported)
      const choicesByArg: Record<string, typeof argAdditionalChoices> = {};
      for (const choice of argAdditionalChoices) {
        let argCodexId: string;
        if (choice.parent.type === "cmdArg" && "idType" in choice.parent) {
          if (choice.parent.idType === "local") {
            argCodexId =
              editor.commandClassArguments[choice.parent.id]?.codexId ??
              entityIdAsCodexId(choice.parent.id);
          } else {
            argCodexId = choice.parent.id;
          }
        } else {
          continue;
        }

        choicesByArg[argCodexId] ||= [];
        choicesByArg[argCodexId].push(choice);
      }

      for (const [argCodexId, choices] of Object.entries(choicesByArg)) {
        exportedCmd.argumentChoices[argCodexId] ||= {};
        choices.sort((a, b) => a.index - b.index);
        exportedCmd.argumentChoices[argCodexId].additional = choices.map(
          (choice) => ({
            id: choice.codexId,
            "@name": choice.localized.name,
            // TODO: description
          }),
        );
      }
    }

    // Handle return choices (excluded and additional)
    if (cmd.returnEnumExclusions) {
      exportedCmd.returnChoices = {};
      const codexExclusions = commandExclusionsToCodex(
        editor,
        cmd.class,
        "return",
        cmd.returnEnumExclusions,
      );
      for (const [retCodexId, excluded] of Object.entries(codexExclusions)) {
        exportedCmd.returnChoices[retCodexId] = {
          excluded,
        };
      }
    }

    // Find additional enum choices for command returns
    const retAdditionalChoices = select(
      editor.enumChoices,
      (choice) =>
        choice.parent.type === "cmdRet" &&
        "cmdId" in choice.parent &&
        choice.parent.cmdId === cmdId,
    );

    // Group additional choices by return codex ID
    if (retAdditionalChoices.length > 0) {
      exportedCmd.returnChoices ||= {};

      // Group by parent ID (which is the return ID for local or codexId for imported)
      const choicesByRet: Record<string, typeof retAdditionalChoices> = {};
      for (const choice of retAdditionalChoices) {
        let retCodexId: string;
        if (choice.parent.type === "cmdRet" && "idType" in choice.parent) {
          if (choice.parent.idType === "local") {
            retCodexId =
              editor.commandClassReturnValues[choice.parent.id]?.codexId ??
              entityIdAsCodexId(choice.parent.id);
          } else {
            retCodexId = choice.parent.id;
          }
        } else {
          continue;
        }

        choicesByRet[retCodexId] ||= [];
        choicesByRet[retCodexId].push(choice);
      }

      for (const [retCodexId, choices] of Object.entries(choicesByRet)) {
        exportedCmd.returnChoices[retCodexId] ||= {};
        choices.sort((a, b) => a.index - b.index);
        exportedCmd.returnChoices[retCodexId].additional = choices.map(
          (choice) => ({
            id: choice.codexId,
            "@name": choice.localized.name,
            // TODO: description
          }),
        );
      }
    }

    codexClass.commands[cmd.codexId] = exportedCmd;
  }
}

function exportDmxSerializer(
  editor: DeviceClassDocument,
  codexClass: DeviceClass,
) {
  if (!editor.dmxSerializer) {
    return;
  }

  const estaDmx = convertDmxSerializerToEstaDmx(editor, editor.dmxSerializer);

  if (Object.keys(estaDmx.chunks).length > 0) {
    codexClass.serializers = codexClass.serializers || {};
    codexClass.serializers.dmx = {
      type: "EstaDmx",
      value: {
        access: ["read"],
        lifetime: "static",
        default: estaDmx,
      },
    };
  }
}

function convertDmxSerializerToEstaDmx(
  editor: DeviceClassDocument,
  dmx: DmxSerializerState,
): EstaDmx {
  const result: EstaDmx = {
    chunks: {},
  };

  // Build reverse map from EntityId to chunk ID for export
  // This needs to be built first before processing any conditions
  const chunkIdMap = new Map<EntityId, string>();
  for (const [chunkEntityId, chunk] of Object.entries(dmx.chunks)) {
    const chunkId = chunk.offsets.join("-");
    chunkIdMap.set(chunkEntityId as EntityId, chunkId);
  }

  // Process each chunk
  for (const [chunkEntityId, chunk] of Object.entries(dmx.chunks)) {
    const chunkId = chunkIdMap.get(chunkEntityId as EntityId)!;

    // Get all mapping groups for this chunk, sorted by index
    const mappingGroups = Object.entries(dmx.mappingGroups)
      .filter(([_, mg]) => mg.chunkId === chunkEntityId)
      .sort((a, b) => a[1].index - b[1].index)
      .map(([mgId, mg]) => {
        // Convert conditions for this mapping group
        const conditions = convertConditionsToNested(
          dmx,
          mgId as EntityId,
          chunkIdMap,
        );

        return {
          mappings: mg.mappings.map((m) => ({
            mappedParam: convertParamReference(editor, m.mappedParam),
            ranges: m.ranges.map((r) => ({
              start: r.start,
              end: r.end,
              chunkValues: convertChunkValues(r.chunkValues),
            })),
            ...(m.unmappedParams
              ? {
                  unmappedParams: m.unmappedParams.map((up) => ({
                    parameter: convertParamReference(editor, up.parameter),
                    start: up.start,
                    end: up.end,
                  })),
                }
              : {}),
          })),
          ...(mg.triggers.length > 0
            ? { triggers: mg.triggers.map((t) => convertTrigger(editor, t)) }
            : {}),
          ...(conditions.length > 0 ? { conditions } : {}),
        };
      });

    result.chunks[chunkId] = {
      offsets: chunk.offsets,
      mappingGroups,
    };
  }

  return result;
}

function convertConditionsToNested(
  dmx: DmxSerializerState,
  mappingGroupId: EntityId,
  chunkIdMap: Map<EntityId, string>,
): Condition[] {
  // Find all conditions that have this mapping group as parent
  const topLevelConditions = Object.entries(dmx.conditions)
    .filter(
      ([_, cond]) =>
        cond.parent.type === "mappingGroup" &&
        cond.parent.id === mappingGroupId,
    )
    .map(([condId]) => condId as EntityId);

  return topLevelConditions.map((condId) =>
    convertConditionToNested(dmx, condId, chunkIdMap),
  );
}

function convertConditionToNested(
  dmx: DmxSerializerState,
  conditionId: EntityId,
  chunkIdMap: Map<EntityId, string>,
): Condition {
  const condition = dmx.conditions[conditionId];

  if (condition.conditionType === "chunkRef") {
    const chunkRefCond = condition as DmxChunkRefCondition;
    const chunkId = chunkIdMap.get(chunkRefCond.chunkId);

    if (!chunkId) {
      throw new Error(
        `Chunk ID not found for entity ID: ${chunkRefCond.chunkId}`,
      );
    }

    return {
      type: "simple" as const,
      value: {
        chunk: chunkId,
        chunkStart: chunkRefCond.chunkStart,
        chunkEnd: chunkRefCond.chunkEnd,
      },
    };
  } else {
    const groupCond = condition as DmxConditionGroup;

    // Find all child conditions
    const childConditionIds = Object.entries(dmx.conditions)
      .filter(
        ([_, cond]) =>
          cond.parent.type === "condition" && cond.parent.id === conditionId,
      )
      .map(([childId]) => childId as EntityId);

    const childConditions = childConditionIds.map((childId) =>
      convertConditionToNested(dmx, childId, chunkIdMap),
    );

    return {
      type: "group" as const,
      value: {
        condMatch: groupCond.match,
        conditions: childConditions,
      },
    };
  }
}
