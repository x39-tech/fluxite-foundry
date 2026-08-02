// Where a device class document keeps its localized strings. See
// features/localizations/types.ts for what a registry is for and how to use it.

import {
  CodexId,
  DeviceClassDocument,
  EntityId,
  EnumChoiceParent,
} from "app/persistentState";
import {
  LocalizationRegistry,
  LocalizableEntityOf,
  LocalizableEntityRef,
  LocalizableEntryKey,
  LocalizableFieldRef,
  LocalizableFieldSpec,
  LocalizableRecordOf,
  LocalizationValues,
  Unlocalized,
} from "features/localizations/types";
import {
  createLocalizedFields,
  removeLocalizationsFor,
  setLocalizedValue,
} from "features/localizations/registry";

type DeviceClassEntryKey = LocalizableEntryKey<DeviceClassDocument>;

/**
 * Builds the key prefix that identifies an enum choice's parent, which is what
 * makes a choice's key readable and unique. Returns undefined when the parent
 * or its class is missing, in which case the choice cannot be given a new
 * string.
 */
export function getParentLocIdPrefix(
  editor: DeviceClassDocument,
  parent: EnumChoiceParent,
): string | undefined {
  switch (parent.type) {
    case "paramAdditional": {
      const codexId = editor.parameters[parent.id]?.codexId;
      return codexId ? `param_${codexId}` : undefined;
    }
    case "paramClass": {
      const codexId = editor.parameterClasses[parent.id]?.codexId;
      return codexId ? `paramClass_${codexId}` : undefined;
    }
    case "cmdClassArg": {
      const arg = editor.commandClassArguments[parent.id];
      const classCodexId = arg && editor.commandClasses[arg.parentId]?.codexId;
      return classCodexId
        ? `commandClass_${classCodexId}_arg_${arg.codexId}`
        : undefined;
    }
    case "cmdClassRet": {
      const ret = editor.commandClassReturnValues[parent.id];
      const classCodexId = ret && editor.commandClasses[ret.parentId]?.codexId;
      return classCodexId
        ? `commandClass_${classCodexId}_return_${ret.codexId}`
        : undefined;
    }
    case "cmdArg": {
      const cmdCodexId = editor.commands[parent.cmdId]?.codexId;
      const argCodexId =
        parent.idType === "local"
          ? editor.commandClassArguments[parent.id]?.codexId
          : parent.id;

      return cmdCodexId && argCodexId
        ? `command_${cmdCodexId}_arg_${argCodexId}`
        : undefined;
    }
    case "cmdRet": {
      const cmdCodexId = editor.commands[parent.cmdId]?.codexId;
      const retCodexId =
        parent.idType === "local"
          ? editor.commandClassReturnValues[parent.id]?.codexId
          : parent.id;

      return cmdCodexId && retCodexId
        ? `command_${cmdCodexId}_return_${retCodexId}`
        : undefined;
    }
  }
}

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

export const DEVICE_CLASS_LOCALIZATIONS: LocalizationRegistry<DeviceClassDocument> =
  {
    basicData: {
      kind: "singleton",
      label: "Device class",
      fields: {
        description: {
          label: "Description",
          required: true,
          makeKey: () => "devClass_description",
        },
      },
    },

    parameterClasses: {
      kind: "table",
      label: "Parameter class",
      fields: classFields("paramClass"),
    },

    structureClasses: {
      kind: "table",
      label: "Structure class",
      fields: classFields("structClass"),
    },

    serializerClasses: {
      kind: "table",
      label: "Serializer class",
      fields: classFields("serClass"),
    },

    resourceClasses: {
      kind: "table",
      label: "Resource class",
      fields: classFields("resClass"),
    },

    commandClasses: {
      kind: "table",
      label: "Command class",
      fields: classFields("commandClass"),
    },

    commandClassArguments: {
      kind: "table",
      label: "Command argument",
      fields: classMemberFields("arg"),
    },

    commandClassReturnValues: {
      kind: "table",
      label: "Command return value",
      fields: classMemberFields("return"),
    },

    parameters: {
      kind: "table",
      label: "Parameter",
      fields: {
        friendlyName: {
          label: "Friendly name",
          makeKey: ({ entity }) => `param_${entity.codexId}`,
        },
      },
    },

    commands: {
      kind: "table",
      label: "Command",
      fields: {
        friendlyName: {
          label: "Friendly name",
          makeKey: ({ entity }) => `command_${entity.codexId}`,
        },
      },
    },

    enumChoices: {
      kind: "table",
      label: "Enum choice",
      fields: {
        name: {
          label: "Name",
          required: true,
          makeKey: ({ document, entity }) =>
            enumChoiceKey(document, entity, "name"),
        },
        description: {
          label: "Description",
          makeKey: ({ document, entity }) =>
            enumChoiceKey(document, entity, "description"),
        },
      },
    },
  };

// A class in the device class's own library: keyed by its own codex id.
interface ClassEntity {
  codexId: CodexId;
}

type NameAndDescriptionFields<Entity> = {
  name: LocalizableFieldSpec<DeviceClassDocument, Entity> & { required: true };
  description: LocalizableFieldSpec<DeviceClassDocument, Entity> & {
    required?: false;
  };
};

function classFields(prefix: string): NameAndDescriptionFields<ClassEntity> {
  return {
    name: {
      label: "Name",
      required: true,
      makeKey: ({ entity }) => `${prefix}_${entity.codexId}_name`,
    },
    description: {
      label: "Description",
      makeKey: ({ entity }) => `${prefix}_${entity.codexId}_description`,
    },
  };
}

// An argument or return value, keyed within its owning command class.
interface ClassMemberEntity {
  parentId: EntityId;
  codexId: CodexId;
}

function classMemberFields(
  kind: "arg" | "return",
): NameAndDescriptionFields<ClassMemberEntity> {
  const key = (
    document: DeviceClassDocument,
    member: ClassMemberEntity,
    field: string,
  ) => {
    const classCodexId = document.commandClasses[member.parentId]?.codexId;
    return classCodexId
      ? `commandClass_${classCodexId}_${kind}_${member.codexId}_${field}`
      : undefined;
  };

  return {
    name: {
      label: "Name",
      required: true,
      makeKey: ({ document, entity }) => key(document, entity, "name"),
    },
    description: {
      label: "Description",
      makeKey: ({ document, entity }) => key(document, entity, "description"),
    },
  };
}

function enumChoiceKey(
  document: DeviceClassDocument,
  choice: { parent: EnumChoiceParent; codexId: CodexId },
  field: string,
): string | undefined {
  const prefix = getParentLocIdPrefix(document, choice.parent);
  return prefix ? `${prefix}_enumChoice_${choice.codexId}_${field}` : undefined;
}

// Helpers that wrap the generic localization helpers specific to a Device Class.

export function createDeviceClassLocalizations<K extends DeviceClassEntryKey>(
  editor: DeviceClassDocument,
  table: K,
  entityId: EntityId | undefined,
  entity: Unlocalized<LocalizableEntityOf<DeviceClassDocument, K>>,
  values: LocalizationValues<DeviceClassDocument, K>,
  locale: string,
): LocalizableRecordOf<LocalizableEntityOf<DeviceClassDocument, K>> {
  return createLocalizedFields<DeviceClassDocument, K>(
    editor,
    DEVICE_CLASS_LOCALIZATIONS,
    table,
    entityId,
    entity,
    values,
    locale,
  );
}

export function setDeviceClassLocalizedValue<K extends DeviceClassEntryKey>(
  editor: DeviceClassDocument,
  target: LocalizableFieldRef<DeviceClassDocument, K>,
  newValue: string,
  locale: string,
): void {
  setLocalizedValue<DeviceClassDocument, K>(
    editor,
    DEVICE_CLASS_LOCALIZATIONS,
    target,
    newValue,
    locale,
  );
}

export function removeDeviceClassLocalizations(
  editor: DeviceClassDocument,
  refs: LocalizableEntityRef<DeviceClassDocument>[],
): void {
  removeLocalizationsFor(editor, DEVICE_CLASS_LOCALIZATIONS, refs);
}
