// Where a device class document keeps its localized strings. See
// features/localizations/types.ts for what a registry is for and how to use it.

import { DeviceClassDocument } from "app/persistentState";
import { ClassLocalizer } from "features/classEditors/context";
import {
  LocalizationRegistry,
  LocalizableEntityOf,
  LocalizableEntityRef,
  LocalizableEntryKey,
  LocalizableFieldRef,
  LocalizableFieldSpec,
  LocalizableRecordOf,
  LocalizationValues,
} from "features/localizations/types";
import {
  createLocalizedFields,
  removeLocalizationsFor,
  setLocalizedValue,
} from "features/localizations/registry";

type DeviceClassEntryKey = LocalizableEntryKey<DeviceClassDocument>;

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
        },
      },
    },

    parameterClasses: {
      kind: "table",
      label: "Parameter class",
      fields: nameAndDescription(),
    },

    structureClasses: {
      kind: "table",
      label: "Structure class",
      fields: nameAndDescription(),
    },

    serializerClasses: {
      kind: "table",
      label: "Serializer class",
      fields: nameAndDescription(),
    },

    resourceClasses: {
      kind: "table",
      label: "Resource class",
      fields: nameAndDescription(),
    },

    commandClasses: {
      kind: "table",
      label: "Command class",
      fields: nameAndDescription(),
    },

    commandClassArguments: {
      kind: "table",
      label: "Command argument",
      fields: nameAndDescription(),
    },

    commandClassReturnValues: {
      kind: "table",
      label: "Command return value",
      fields: nameAndDescription(),
    },

    parameters: {
      kind: "table",
      label: "Parameter",
      fields: {
        friendlyName: {
          label: "Friendly name",
        },
      },
    },

    commands: {
      kind: "table",
      label: "Command",
      fields: {
        friendlyName: {
          label: "Friendly name",
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
        },
        description: {
          label: "Description",
        },
      },
    },
  };

type NameAndDescriptionFields = {
  name: LocalizableFieldSpec & { required: true };
  description: LocalizableFieldSpec & { required?: false };
};

// Most of a device class's localizable entities fit this shape for their
// localizable fields.
function nameAndDescription(): NameAndDescriptionFields {
  return {
    name: {
      label: "Name",
      required: true,
    },
    description: {
      label: "Description",
    },
  };
}

// Helpers that wrap the generic localization helpers specific to a Device Class.

export function createDeviceClassLocalizations<K extends DeviceClassEntryKey>(
  editor: DeviceClassDocument,
  table: K,
  values: LocalizationValues<DeviceClassDocument, K>,
  locale: string,
): LocalizableRecordOf<LocalizableEntityOf<DeviceClassDocument, K>> {
  return createLocalizedFields<DeviceClassDocument, K>(
    editor,
    DEVICE_CLASS_LOCALIZATIONS,
    table,
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

/**
 * Implementation of localizer from the generic class editing API defined in
 * features/classEditors/context.tsx.
 */
export function deviceClassLocalizer(
  editor: DeviceClassDocument,
): ClassLocalizer {
  return {
    create: (table, values, locale) =>
      createDeviceClassLocalizations(
        editor,
        table,
        { name: values.name, description: values.description },
        locale,
      ),
    set: (table, entityId, field, value, locale) =>
      setDeviceClassLocalizedValue(
        editor,
        { table, entityId, field },
        value,
        locale,
      ),
    remove: (refs) => removeDeviceClassLocalizations(editor, refs),
  };
}
