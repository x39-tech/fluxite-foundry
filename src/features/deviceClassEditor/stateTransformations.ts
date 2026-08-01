import { DataType, Unit } from "@cpwg-community/delver";
import {
  LocalOrImportedId,
  CodexId,
  CommandClass,
  EntityId,
  LocalizationKey,
  ParameterClass,
  ResourceClass,
} from "app/persistentState";
import { Unlocalized } from "features/localizations/types";
import { localize, LocalizedString } from "features/localizations/localize";
import { selectWithIds } from "app/stateUtils";
import { ResolvedClassRef } from "./classResolution";

export interface LocalizedClassEnumChoice {
  id: LocalOrImportedId;
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
  id: LocalOrImportedId;
  codexId: CodexId;
  name: LocalizedString;
  descripton?: LocalizedString;
  dataType: DataType;
  unit?: Unit;
  required: boolean;
  choices: LocalizedClassEnumChoice[];
}

export interface LocalizedCommandClassReturnValue {
  id: LocalOrImportedId;
  codexId: CodexId;
  name: LocalizedString;
  descripton?: LocalizedString;
  dataType: DataType;
  unit?: Unit;
  required: boolean;
  choices: LocalizedClassEnumChoice[];
}

export interface ResolvedParameterClass extends Unlocalized<ParameterClass> {
  name: LocalizedString;
  description?: LocalizedString;
  choices: LocalizedClassEnumChoice[];
}

export interface ResolvedResourceClass extends Unlocalized<ResourceClass> {
  name: LocalizedString;
  description?: LocalizedString;
}

export interface ResolvedCommandClass extends Unlocalized<CommandClass> {
  name: LocalizedString;
  description?: LocalizedString;
  arguments: Record<CodexId, LocalizedCommandClassArgument>;
  returnValues: Record<CodexId, LocalizedCommandClassReturnValue>;
}

export function lookupParameterClass(
  resolved: ResolvedClassRef,
  locale: string,
): ResolvedParameterClass | undefined {
  const { library, classId } = resolved;
  const cls = library.parameterClasses[classId];
  if (!cls) {
    return undefined;
  }

  return {
    codexId: cls.codexId,
    name: localize(library.localizations, cls.localized.name, locale),
    description: optionalLocalize(resolved, cls.localized.description, locale),
    unit: cls.unit,
    dataType: cls.dataType,
    choices: localizeClassEnumChoices(resolved, "paramClass", classId, locale),
  };
}

export function lookupResourceClass(
  resolved: ResolvedClassRef,
  locale: string,
): ResolvedResourceClass | undefined {
  const { library, classId } = resolved;
  const cls = library.resourceClasses[classId];
  if (!cls) {
    return undefined;
  }

  return {
    codexId: cls.codexId,
    name: localize(library.localizations, cls.localized.name, locale),
    description: optionalLocalize(resolved, cls.localized.description, locale),
    mediaType: cls.mediaType,
  };
}

export function lookupCommandClass(
  resolved: ResolvedClassRef,
  locale: string,
): ResolvedCommandClass | undefined {
  const { library, classId } = resolved;
  const cls = library.commandClasses[classId];
  if (!cls) {
    return undefined;
  }

  const cmdArguments: Record<CodexId, LocalizedCommandClassArgument> =
    Object.fromEntries(
      selectWithIds(
        library.commandClassArguments,
        (arg) => arg.parentId === classId,
      ).map((arg) => [
        arg.codexId,
        {
          id: localOrImportedId(resolved, arg.id, arg.codexId),
          codexId: arg.codexId,
          name: localize(library.localizations, arg.localized.name, locale),
          descripton: optionalLocalize(
            resolved,
            arg.localized.description,
            locale,
          ),
          dataType: arg.dataType as DataType,
          unit: arg.unit as Unit,
          required: arg.required,
          choices: localizeClassEnumChoices(
            resolved,
            "cmdClassArg",
            arg.id,
            locale,
          ),
        },
      ]),
    );

  const returnValues: Record<CodexId, LocalizedCommandClassReturnValue> =
    Object.fromEntries(
      selectWithIds(
        library.commandClassReturnValues,
        (ret) => ret.parentId === classId,
      ).map((ret) => [
        ret.codexId,
        {
          id: localOrImportedId(resolved, ret.id, ret.codexId),
          codexId: ret.codexId,
          name: localize(library.localizations, ret.localized.name, locale),
          descripton: optionalLocalize(
            resolved,
            ret.localized.description,
            locale,
          ),
          dataType: ret.dataType as DataType,
          unit: ret.unit as Unit,
          required: ret.required,
          choices: localizeClassEnumChoices(
            resolved,
            "cmdClassRet",
            ret.id,
            locale,
          ),
        },
      ]),
    );

  return {
    codexId: cls.codexId,
    name: localize(library.localizations, cls.localized.name, locale),
    description: optionalLocalize(resolved, cls.localized.description, locale),
    arguments: cmdArguments,
    returnValues,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// The id persistent state uses to reference a member of this class.
function localOrImportedId(
  resolved: ResolvedClassRef,
  entityId: EntityId,
  codexId: CodexId,
): LocalOrImportedId {
  return resolved.index ? codexId : entityId;
}

function optionalLocalize(
  resolved: ResolvedClassRef,
  key: LocalizationKey | undefined,
  locale: string,
): LocalizedString | undefined {
  return key
    ? localize(resolved.library.localizations, key, locale)
    : undefined;
}

function localizeClassEnumChoices(
  resolved: ResolvedClassRef,
  parentType: "paramClass" | "cmdClassArg" | "cmdClassRet",
  parentId: EntityId,
  locale: string,
): LocalizedClassEnumChoice[] {
  const choices = selectWithIds(
    resolved.library.enumChoices,
    (choice) =>
      choice.parent.type === parentType && choice.parent.id === parentId,
  );
  choices.sort((e1, e2) => e1.index - e2.index);

  return choices.map((choice) => ({
    id: localOrImportedId(resolved, choice.id, choice.codexId),
    codexId: choice.codexId,
    name: localize(
      resolved.library.localizations,
      choice.localized.name,
      locale,
    ),
    description: optionalLocalize(
      resolved,
      choice.localized.description,
      locale,
    ),
  }));
}
