import {
  EnumChoice as FCEnumChoice,
  DefinitionLocalization,
  DataType,
  Unit,
} from "e173";
import { CodexDatabase } from "codex/codexDatabase";
import {
  CodexId,
  CommandArgument,
  CommandClass,
  CommandReturnValue,
  EntityId,
  EnumChoice,
  Localization,
  LocalizationKey,
  ParameterClass,
  ResourceClass,
  Unlocalized,
} from "app/persistentState";
import { fcLocalize, localize, LocalizedString } from "utils/localizationUtils";
import { select, selectWithIds } from "app/stateUtils";

export interface LocalizedClassEnumChoice {
  codexId: CodexId;
  name: LocalizedString;
  description?: LocalizedString;
}

export interface LocalizedInstanceEnumChoice {
  id: EntityId;
  codexId: CodexId;
  index: number;
  name: LocalizedString;
  description?: LocalizedString;
}

export interface LocalizedCommandClassArgument {
  codexId: CodexId;
  name: LocalizedString;
  descripton?: LocalizedString;
  dataType: DataType;
  unit?: Unit;
  required: boolean;
  choices: LocalizedClassEnumChoice[];
}

export interface LocalizedCommandClassReturnValue {
  codexId: CodexId;
  name: LocalizedString;
  descripton?: LocalizedString;
  dataType: DataType;
  unit?: Unit;
  required: boolean;
  choices: LocalizedClassEnumChoice[];
}

export interface ResolvedParameterClass extends Unlocalized<ParameterClass> {
  libraryId?: string;
  libraryVersion?: string;
  name: LocalizedString;
  description?: LocalizedString;
  choices: LocalizedClassEnumChoice[];
}

export interface ResolvedResourceClass extends Unlocalized<ResourceClass> {
  libraryId?: string;
  libraryVersion?: string;
  name: LocalizedString;
  description?: LocalizedString;
}

export interface ResolvedCommandClass extends Unlocalized<CommandClass> {
  libraryId?: string;
  libraryVersion?: string;
  name: LocalizedString;
  description?: LocalizedString;
  arguments: Record<string, LocalizedCommandClassArgument>;
  returnValues: Record<string, LocalizedCommandClassReturnValue>;
}

export function lookupParameterClass(
  database: Readonly<CodexDatabase>,
  classId: CodexId,
  libraryId: string,
  libraryVersion: string,
  locale: string,
): ResolvedParameterClass | undefined {
  const library = database.libraries[libraryId]?.[libraryVersion];
  if (!library) {
    return undefined;
  }

  const cls = library.parameterClasses?.[classId];

  if (cls) {
    const localizedName = fcLocalize(
      library.localizations,
      cls["@name"],
      locale,
    );
    const localizedDesc = cls["@description"]
      ? fcLocalize(library.localizations, cls["@description"], locale)
      : undefined;

    const localizedChoices = fcLocalizeEnumChoices(
      cls.choices || [],
      library.localizations,
      locale,
    );

    return {
      codexId: classId,
      libraryId,
      libraryVersion,
      name: localizedName,
      description: localizedDesc,
      unit: cls.unit,
      dataType: cls.dataType,
      choices: localizedChoices,
    };
  } else {
    return undefined;
  }
}

export function lookupDeviceParameterClass(
  parameterClasses: Record<EntityId, ParameterClass>,
  localizations: Record<LocalizationKey, Localization>,
  enumChoices: Record<EntityId, EnumChoice>,
  classId: EntityId,
  locale: string,
): ResolvedParameterClass | undefined {
  const cls = parameterClasses[classId];

  if (cls) {
    const choices = selectWithIds(
      enumChoices,
      (e) => e.parent.type === "paramClass" && e.parent.id === classId,
    );
    choices.sort((e1, e2) => e1.index - e2.index);

    const name = localize(localizations, cls.localized.name, locale);

    const description = cls.localized.description
      ? localize(localizations, cls.localized.description, locale)
      : undefined;

    return {
      codexId: cls.codexId,
      name,
      description,
      unit: cls.unit,
      dataType: cls.dataType,
      choices: choices.map((e) => {
        const name = localize(localizations, e.localized.name, locale);
        const description = e.localized.description
          ? localize(localizations, e.localized.description, locale)
          : undefined;

        return {
          codexId: e.codexId,
          name,
          description,
        };
      }),
    };
  } else {
    return undefined;
  }
}

export function lookupResourceClass(
  database: Readonly<CodexDatabase>,
  classId: CodexId,
  libraryId: string,
  libraryVersion: string,
  locale: string,
): ResolvedResourceClass | undefined {
  const library = database.libraries[libraryId]?.[libraryVersion];
  if (!library) {
    return undefined;
  }

  const cls = library.resourceClasses?.[classId];

  if (cls) {
    const localizedName = fcLocalize(
      library.localizations,
      cls["@name"],
      locale,
    );
    const localizedDesc = cls["@description"]
      ? fcLocalize(library.localizations, cls["@description"], locale)
      : undefined;

    return {
      codexId: classId,
      libraryId,
      libraryVersion,
      name: localizedName,
      description: localizedDesc,
      mediaType: cls.mediaType,
    };
  } else {
    return undefined;
  }
}

export function lookupDeviceResourceClass(
  resourceClasses: Record<EntityId, ResourceClass>,
  localizations: Record<LocalizationKey, Localization>,
  classId: EntityId,
  locale: string,
): ResolvedResourceClass | undefined {
  const cls = resourceClasses[classId];
  if (cls) {
    const name = localize(localizations, cls.localized.name, locale);

    const description = cls.localized.description
      ? localize(localizations, cls.localized.description, locale)
      : undefined;

    return {
      codexId: cls.codexId,
      name,
      description,
      mediaType: cls.mediaType,
    };
  } else {
    return undefined;
  }
}

export function lookupCommandClass(
  database: Readonly<CodexDatabase>,
  classId: CodexId,
  libraryId: string,
  libraryVersion: string,
  locale: string,
): ResolvedCommandClass | undefined {
  const library = database.libraries[libraryId]?.[libraryVersion];
  if (!library) {
    return undefined;
  }

  const cls = library.commandClasses?.[classId];

  if (cls) {
    const localizedName = fcLocalize(
      library.localizations,
      cls["@name"],
      locale,
    );
    const localizedDesc = cls["@description"]
      ? fcLocalize(library.localizations, cls["@description"], locale)
      : undefined;

    const cmdArguments: Record<CodexId, LocalizedCommandClassArgument> =
      Object.fromEntries(
        Object.entries(cls.arguments || {}).map(([argId, arg]) => {
          const argCodexId = CodexId(argId);

          const localizedArgName = fcLocalize(
            library.localizations,
            arg["@name"],
            locale,
          );
          const localizedArgDesc = arg["@description"]
            ? fcLocalize(library.localizations, arg["@description"], locale)
            : undefined;

          const localizedArgChoices = fcLocalizeEnumChoices(
            arg.choices || [],
            library.localizations,
            locale,
          );

          return [
            argCodexId,
            {
              codexId: argCodexId,
              name: localizedArgName,
              descripton: localizedArgDesc,
              dataType: arg.dataType,
              unit: arg.unit,
              required: arg.required,
              choices: localizedArgChoices,
            },
          ];
        }),
      );

    const returnValues: Record<CodexId, LocalizedCommandClassReturnValue> =
      Object.fromEntries(
        Object.entries(cls.returns || {}).map(([returnId, returnVal]) => {
          const returnCodexId = CodexId(returnId);

          const localizedReturnName = fcLocalize(
            library.localizations,
            returnVal["@name"],
            locale,
          );
          const localizedReturnDesc = returnVal["@description"]
            ? fcLocalize(
                library.localizations,
                returnVal["@description"],
                locale,
              )
            : undefined;

          const localizedReturnChoices = fcLocalizeEnumChoices(
            returnVal.choices || [],
            library.localizations,
            locale,
          );

          return [
            returnCodexId,
            {
              codexId: returnCodexId,
              name: localizedReturnName,
              descripton: localizedReturnDesc,
              dataType: returnVal.dataType,
              unit: returnVal.unit,
              required: returnVal.required,
              choices: localizedReturnChoices,
            },
          ];
        }),
      );

    return {
      codexId: classId,
      libraryId,
      libraryVersion,
      name: localizedName,
      description: localizedDesc,
      arguments: cmdArguments,
      returnValues,
    };
  } else {
    return undefined;
  }
}

export function lookupDeviceCommandClass(
  commandClasses: Record<EntityId, CommandClass>,
  commandClassArguments: Record<EntityId, CommandArgument>,
  commandClassReturnValues: Record<EntityId, CommandReturnValue>,
  enumChoices: Record<EntityId, EnumChoice>,
  localizations: Record<LocalizationKey, Localization>,
  classId: EntityId,
  locale: string,
): ResolvedCommandClass | undefined {
  const cls = commandClasses[classId];
  if (cls) {
    const name = localize(localizations, cls.localized.name, locale);

    const description = cls.localized.description
      ? localize(localizations, cls.localized.description, locale)
      : undefined;

    const cmdArguments: Record<string, LocalizedCommandClassArgument> =
      Object.fromEntries(
        selectWithIds(
          commandClassArguments,
          (arg) => arg.parentId === classId,
        ).map((arg) => {
          const localizedArgName = localize(
            localizations,
            arg.localized.name,
            locale,
          );

          const localizedArgDesc = arg.localized.description
            ? localize(localizations, arg.localized.description, locale)
            : undefined;

          const localizedArgChoices = localizeEnumChoices(
            select(
              enumChoices,
              (choice) =>
                choice.parent.type === "cmdClassArg" &&
                choice.parent.id === arg.id,
            ),
            localizations,
            locale,
          );

          return [
            arg.codexId,
            {
              codexId: arg.codexId,
              name: localizedArgName,
              descripton: localizedArgDesc,
              dataType: arg.dataType as DataType,
              unit: arg.unit as Unit,
              required: arg.required,
              choices: localizedArgChoices,
            },
          ];
        }),
      );

    const cmdReturnValues: Record<string, LocalizedCommandClassReturnValue> =
      Object.fromEntries(
        selectWithIds(
          commandClassReturnValues,
          (returnVal) => returnVal.parentId === classId,
        ).map((returnVal) => {
          const localizedArgName = localize(
            localizations,
            returnVal.localized.name,
            locale,
          );

          const localizedArgDesc = returnVal.localized.description
            ? localize(localizations, returnVal.localized.description, locale)
            : undefined;

          const localizedArgChoices = localizeEnumChoices(
            select(
              enumChoices,
              (choice) =>
                choice.parent.type === "cmdClassRet" &&
                choice.parent.id === returnVal.id,
            ),
            localizations,
            locale,
          );

          return [
            returnVal.codexId,
            {
              codexId: returnVal.codexId,
              name: localizedArgName,
              descripton: localizedArgDesc,
              dataType: returnVal.dataType as DataType,
              unit: returnVal.unit as Unit,
              required: returnVal.required,
              choices: localizedArgChoices,
            },
          ];
        }),
      );

    return {
      codexId: cls.codexId,
      name,
      description,
      arguments: cmdArguments,
      returnValues: cmdReturnValues,
    };
  } else {
    return undefined;
  }
}

function localizeEnumChoices(
  choices: EnumChoice[],
  localizations: Record<LocalizationKey, Localization>,
  locale: string,
): LocalizedClassEnumChoice[] {
  return choices.map((e) => {
    const name = localize(localizations, e.localized.name, locale);
    const description = e.localized.description
      ? localize(localizations, e.localized.description, locale)
      : undefined;
    return {
      codexId: e.codexId,
      name,
      description,
    };
  });
}

function fcLocalizeEnumChoices(
  choices: FCEnumChoice[],
  localizations: Record<string, DefinitionLocalization> | undefined,
  locale: string,
): LocalizedClassEnumChoice[] {
  // TODO description
  return choices.map((choice) => {
    const localizedName = fcLocalize(localizations, choice["@name"], locale);

    return {
      name: localizedName,
      codexId: CodexId(choice.id),
    };
  });
}
