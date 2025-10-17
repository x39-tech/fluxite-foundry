import {
  Library,
  ParameterClass,
  StructureClass,
  importUdr,
  Error as E173Error,
  DeviceLibrary,
  DefinitionLocalization,
  ResourceClass,
  CommandClass,
  CommandArgument,
  CommandReturnValue,
  EnumChoice,
  Command,
  EnumInstanceChoices,
  Parameter,
} from "e173";
import core from "e173/libraries/core/draft-2024-1/library.json";
import intensityColor from "e173/libraries/intensity-color/draft-2024-1/library.json";
import motion from "e173/libraries/motion/draft-2024-1/library.json";

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Types
///////////////////////////////////////////////////////////////////////////////////////////////////

export interface ItemClass {
  "@name": string;
  "@description"?: string;
}

export interface ItemClassWithId extends ItemClass {
  libraryId: string;
  libraryVersion: string;
  id: string;
}

export interface LibraryWithId extends Library {
  id: string;
  version: string;
}

export type ParameterClassWithId = ParameterClass & ItemClassWithId;

export type StructureClassWithId = StructureClass & ItemClassWithId;

export type ResourceClassWithId = ResourceClass & ItemClassWithId;

export type CommandClassWithId = CommandClass & ItemClassWithId;

interface ItemClassDatabase {
  parameters: ParameterClassWithId[];
  structures: StructureClassWithId[];
  resources: ResourceClassWithId[];
  commands: CommandClassWithId[];
}

interface LibraryDatabase {
  [key: string]: {
    [key: string]: Library;
  };
}

export interface UdrDatabase {
  libraries: LibraryDatabase;
}

export interface ResolvedParameterClass
  extends Omit<ParameterClass, "@name" | "@description" | "choices"> {
  libraryId?: string;
  libraryVersion?: string;
  id: string;
  name: string;
  description?: string;
  choices?: LocalizedEnumChoice[];
}

export interface ResolvedResourceClass
  extends Omit<ResourceClass, "@name" | "@description"> {
  libraryId?: string;
  libraryVersion?: string;
  id: string;
  name: string;
  description?: string;
}

export interface ResolvedCommandClass
  extends Omit<
    CommandClass,
    "@name" | "@description" | "arguments" | "returns"
  > {
  libraryId?: string;
  libraryVersion?: string;
  id: string;
  name: string;
  description?: string;
  arguments?: Record<string, LocalizedCommandArgument>;
  returns?: Record<string, LocalizedCommandReturnValue>;
}

export interface LocalizedCommandArgument
  extends Omit<CommandArgument, "@name" | "@description" | "choices"> {
  name: string;
  description?: string;
  choices?: LocalizedEnumChoice[];
}

export interface LocalizedCommandReturnValue
  extends Omit<CommandReturnValue, "@name" | "@description" | "choices"> {
  name: string;
  description?: string;
  choices?: LocalizedEnumChoice[];
}

export interface LocalizedEnumChoice extends Omit<EnumChoice, "@name"> {
  name: string;
}

export interface LocalizedEnumInstanceChoices
  extends Omit<EnumInstanceChoices, "additional"> {
  additional?: LocalizedEnumChoice[];
}

export interface LocalizedParameter
  extends Omit<Parameter, "@friendlyName" | "choices"> {
  friendlyName?: string;
  choices?: LocalizedEnumInstanceChoices;
}

export interface LocalizedCommand
  extends Omit<Command, "@friendlyName" | "argumentChoices" | "returnChoices"> {
  friendlyName?: string;
  argumentChoices?: Record<string, LocalizedEnumInstanceChoices>;
  returnChoices?: Record<string, LocalizedEnumInstanceChoices>;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

export function getEmptyUdrDatabase(): UdrDatabase {
  return {
    libraries: {},
  };
}

export function udrDatabaseIsEmpty(database: Readonly<UdrDatabase>): boolean {
  return !database.libraries;
}

export function getNewestVersionOfEachLibrary(
  database: Readonly<UdrDatabase>,
): LibraryWithId[] {
  const libraries: LibraryWithId[] = [];
  for (const [libraryId, versions] of Object.entries(database.libraries)) {
    const versionKeys = Object.keys(versions);
    if (versionKeys.length > 0) {
      // TODO: proper version sort
      const newestVersion = versionKeys.sort().reverse()[0];
      libraries.push({
        ...versions[newestVersion],
        id: libraryId,
        version: newestVersion,
      });
    }
  }
  return libraries;
}

export function getItemClassName(
  database: Readonly<UdrDatabase>,
  itemClass: ItemClassWithId,
): string | undefined {
  if (!(itemClass.libraryId in database.libraries)) {
    return undefined;
  }

  const library =
    database.libraries[itemClass.libraryId]?.[itemClass.libraryVersion];

  if (!library) {
    return undefined;
  }

  // TODO: use current localization
  return library.localizations?.["en-US"]?.strings?.[itemClass["@name"]];
}

export function getItemClassNameOrId(
  database: Readonly<UdrDatabase>,
  itemClass: ItemClassWithId,
): string {
  return getItemClassName(database, itemClass) || itemClass.id;
}

export function getItemClassDescription(
  database: Readonly<UdrDatabase>,
  itemClass: ItemClassWithId,
): string | undefined {
  if (!itemClass["@description"]) {
    return undefined;
  }

  const library =
    database.libraries[itemClass.libraryId]?.[itemClass.libraryVersion];

  if (!library) {
    return undefined;
  }

  // TODO: use current localization
  return library.localizations?.["en-US"]?.strings?.[itemClass["@description"]];
}

export function lookupParameterClass(
  database: Readonly<UdrDatabase>,
  libraryId: string,
  libraryVersion: string,
  classId: string,
): ResolvedParameterClass | undefined {
  const library = database.libraries[libraryId]?.[libraryVersion];
  if (!library) {
    return undefined;
  }

  const cls = library.parameterClasses?.[classId];

  if (cls) {
    // TODO: use current localization
    const localizedName =
      library.localizations?.["en-US"]?.strings?.[cls["@name"]];
    const localizedDesc = cls["@description"]
      ? library.localizations?.["en-US"]?.strings?.[cls["@description"]]
      : undefined;

    const localizedChoices = cls.choices
      ? localizeEnumChoices(cls.choices, library.localizations)
      : undefined;

    return {
      id: classId,
      libraryId,
      libraryVersion,
      name: localizedName || cls["@name"],
      description: localizedDesc || cls["@description"],
      unit: cls.unit,
      dataType: cls.dataType,
      choices: localizedChoices,
    };
  } else {
    return undefined;
  }
}

export function lookupDeviceParameterClass(
  deviceLibrary: DeviceLibrary,
  deviceLocalizations: Record<string, DefinitionLocalization>,
  classId: string,
): ResolvedParameterClass | undefined {
  const cls = deviceLibrary.parameterClasses?.[classId];

  if (cls) {
    // TODO: use current localization
    const localizedName = deviceLocalizations["en-US"]?.strings?.[cls["@name"]];
    const localizedDesc = cls["@description"]
      ? deviceLocalizations["en-US"]?.strings?.[cls["@description"]]
      : undefined;

    const localizedChoices = cls.choices
      ? localizeEnumChoices(cls.choices, deviceLocalizations)
      : undefined;

    return {
      id: classId,
      name: localizedName || cls["@name"],
      description: localizedDesc || cls["@description"],
      unit: cls.unit,
      dataType: cls.dataType,
      choices: localizedChoices,
    };
  } else {
    return undefined;
  }
}

export function lookupStructureClass(
  database: Readonly<UdrDatabase>,
  libraryId: string,
  libraryVersion: string,
  classId: string,
): StructureClassWithId | undefined {
  const cls =
    database.libraries[libraryId]?.[libraryVersion]?.structureClasses?.[
      classId
    ];

  return cls
    ? {
        ...cls,
        id: classId,
        libraryId,
        libraryVersion,
      }
    : undefined;
}

export function lookupResourceClass(
  database: Readonly<UdrDatabase>,
  libraryId: string,
  libraryVersion: string,
  classId: string,
): ResolvedResourceClass | undefined {
  const library = database.libraries[libraryId]?.[libraryVersion];
  if (!library) {
    return undefined;
  }

  const cls = library.resourceClasses?.[classId];

  if (cls) {
    // TODO: use current localization
    const localizedName =
      library.localizations?.["en-US"]?.strings?.[cls["@name"]];
    const localizedDesc = cls["@description"]
      ? library.localizations?.["en-US"]?.strings?.[cls["@description"]]
      : undefined;

    return {
      id: classId,
      libraryId,
      libraryVersion,
      name: localizedName || cls["@name"],
      description: localizedDesc || cls["@description"],
      mediaType: cls.mediaType,
    };
  } else {
    return undefined;
  }
}

export function lookupDeviceResourceClass(
  deviceLibrary: DeviceLibrary,
  deviceLocalizations: Record<string, DefinitionLocalization>,
  classId: string,
): ResolvedResourceClass | undefined {
  const cls = deviceLibrary.resourceClasses?.[classId];

  if (cls) {
    // TODO: use current localization
    const localizedName = deviceLocalizations["en-US"]?.strings?.[cls["@name"]];
    const localizedDesc = cls["@description"]
      ? deviceLocalizations["en-US"]?.strings?.[cls["@description"]]
      : undefined;

    return {
      id: classId,
      name: localizedName || cls["@name"],
      description: localizedDesc || cls["@description"],
      mediaType: cls.mediaType,
    };
  } else {
    return undefined;
  }
}

// TODO: see if these functions can be combined / genericized
export function lookupCommandClass(
  database: Readonly<UdrDatabase>,
  libraryId: string,
  libraryVersion: string,
  classId: string,
): ResolvedCommandClass | undefined {
  const library = database.libraries[libraryId]?.[libraryVersion];
  if (!library) {
    return undefined;
  }

  const cls = library.commandClasses?.[classId];

  if (cls) {
    // TODO: use current localization
    const localizedName =
      library.localizations?.["en-US"]?.strings?.[cls["@name"]];
    const localizedDesc = cls["@description"]
      ? library.localizations?.["en-US"]?.strings?.[cls["@description"]]
      : undefined;

    return {
      ...cls,
      id: classId,
      libraryId,
      libraryVersion,
      name: localizedName || cls["@name"],
      description: localizedDesc || cls["@description"],
      arguments: resolveCommandArguments(cls.arguments, library.localizations),
      returns: resolveCommandReturnValues(cls.returns, library.localizations),
    };
  } else {
    return undefined;
  }
}

export function lookupDeviceCommandClass(
  deviceLibrary: DeviceLibrary,
  deviceLocalizations: Record<string, DefinitionLocalization>,
  classId: string,
): ResolvedCommandClass | undefined {
  const cls = deviceLibrary.commandClasses?.[classId];

  if (cls) {
    // TODO: use current localization
    const localizedName = deviceLocalizations["en-US"]?.strings?.[cls["@name"]];
    const localizedDesc = cls["@description"]
      ? deviceLocalizations["en-US"]?.strings?.[cls["@description"]]
      : undefined;

    return {
      ...cls,
      id: classId,
      name: localizedName || cls["@name"],
      description: localizedDesc || cls["@description"],
      arguments: resolveCommandArguments(cls.arguments, deviceLocalizations),
      returns: resolveCommandReturnValues(cls.returns, deviceLocalizations),
    };
  } else {
    return undefined;
  }
}

export function getLocalizedParameter(
  param: Parameter,
  localizations: Record<string, DefinitionLocalization>,
): LocalizedParameter {
  const { "@friendlyName": friendlyNameKey, choices, ...rest } = param;

  const localizedName = friendlyNameKey
    ? localizations["en-US"]?.strings?.[friendlyNameKey]
    : undefined;

  const localizedChoices = choices
    ? {
        excluded: choices.excluded,
        additional: choices.additional
          ? localizeEnumChoices(choices.additional, localizations)
          : undefined,
      }
    : undefined;

  return {
    ...rest,
    friendlyName: localizedName || param["@friendlyName"],
    choices: localizedChoices,
  };
}

export function getLocalizedCommand(
  command: Command,
  localizations: Record<string, DefinitionLocalization>,
): LocalizedCommand {
  // TODO use current localization
  const localizedName = command["@friendlyName"]
    ? localizations["en-US"]?.strings?.[command["@friendlyName"]]
    : undefined;

  const argumentChoices = command.argumentChoices
    ? Object.fromEntries(
        Object.entries(command.argumentChoices).map(([id, instanceChoices]) => {
          const localizedInstanceChoices = {
            excluded: instanceChoices.excluded,
            additional: instanceChoices.additional
              ? localizeEnumChoices(instanceChoices.additional, localizations)
              : undefined,
          };

          return [id, localizedInstanceChoices];
        }),
      )
    : undefined;

  const returnChoices = command.returnChoices
    ? Object.fromEntries(
        Object.entries(command.returnChoices).map(([id, instanceChoices]) => {
          const localizedInstanceChoices = {
            excluded: instanceChoices.excluded,
            additional: instanceChoices.additional
              ? localizeEnumChoices(instanceChoices.additional, localizations)
              : undefined,
          };

          return [id, localizedInstanceChoices];
        }),
      )
    : undefined;

  return {
    ...command,
    friendlyName: localizedName || command["@friendlyName"],
    argumentChoices,
    returnChoices,
  };
}

export function getLibraryFriendlyName(library: LibraryWithId): string {
  return (
    library.localizations?.["en-US"]?.strings?.[library["@description"]] ||
    library.id
  );
}

export type LoadLibrariesResult = true | string;

export function loadLibrariesFromDocument(
  doc_obj: object,
  database: UdrDatabase,
): LoadLibrariesResult {
  let document;
  try {
    document = importUdr(doc_obj);
  } catch (err) {
    const e173err = err as E173Error;
    let errMsg = `Error loading UDR library document: ${e173err.type}: ${e173err.description}`;
    if (e173err.path) {
      errMsg += `at ${e173err.path}`;
    } else if (e173err.line && e173err.column) {
      errMsg += `at line ${e173err.line}, column ${e173err.column}`;
    }
    return errMsg;
  }

  const libraries = document.e173doc.libraries;
  if (!libraries) {
    // Nothing to load
    return true;
  }

  for (const [key, versionCollection] of Object.entries(libraries)) {
    if (key in database.libraries) {
      for (const version in versionCollection) {
        if (version in database.libraries[key]) {
          // Library already exists
          return "A library with the same identifier is already loaded";
        }
      }
    }
  }

  // TODO: Verify localizations

  let itemDb: ItemClassDatabase = {
    parameters: [],
    structures: [],
    resources: [],
    commands: [],
  };
  for (const [libraryId, libraryVersionCollection] of Object.entries(
    libraries,
  )) {
    for (const [version, library] of Object.entries(libraryVersionCollection)) {
      itemDb = concatItemClasses(itemDb, {
        parameters: transformItemClasses(
          libraryId,
          version,
          library.parameterClasses || {},
        ),
        structures: transformItemClasses(
          libraryId,
          version,
          library.structureClasses || {},
        ),
        resources: transformItemClasses(
          libraryId,
          version,
          library.resourceClasses || {},
        ),
        commands: transformItemClasses(
          libraryId,
          version,
          library.commandClasses || {},
        ),
      });
    }
  }

  database.libraries = {
    ...libraries,
    ...database.libraries,
  };

  return true;
}

const DEFAULT_LIBRARY_DOCUMENTS = [core, intensityColor, motion];

export function loadDefaultLibraries(): UdrDatabase {
  const database = getEmptyUdrDatabase();

  for (const document of DEFAULT_LIBRARY_DOCUMENTS) {
    const loadLibrariesResult = loadLibrariesFromDocument(document, database);
    if (loadLibrariesResult !== true) {
      console.log(`Error loading default library: ${loadLibrariesResult}`);
    }
  }

  return database;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

function transformItemClasses<ClassType extends ItemClass>(
  libraryId: string,
  libraryVersion: string,
  libraryClasses: Record<string, ClassType>,
): (ClassType & ItemClassWithId)[] {
  return libraryClasses
    ? Object.entries(libraryClasses).map(([id, itemClass]) => {
        return {
          libraryId,
          libraryVersion,
          id,
          ...itemClass,
        };
      })
    : [];
}

function concatItemClasses(
  existingDb: ItemClassDatabase,
  newDb: ItemClassDatabase,
): ItemClassDatabase {
  return {
    parameters: existingDb.parameters.concat(newDb.parameters),
    structures: existingDb.structures.concat(newDb.structures),
    resources: existingDb.resources.concat(newDb.resources),
    commands: existingDb.commands.concat(newDb.commands),
  };
}

function resolveCommandArguments(
  cmdArgs?: Record<string, CommandArgument>,
  localizations?: Record<string, DefinitionLocalization>,
): Record<string, LocalizedCommandArgument> | undefined {
  return cmdArgs
    ? Object.fromEntries(
        Object.entries(cmdArgs).map(([id, arg]) => {
          const {
            "@name": nameId,
            "@description": descId,
            choices,
            ...toReturn
          } = arg;

          const localizedName = localizations?.["en-US"]?.strings?.[nameId];
          const localizedDesc = descId
            ? localizations?.["en-US"]?.strings?.[descId]
            : undefined;

          return [
            id,
            {
              ...toReturn,
              name: localizedName || nameId,
              description: localizedDesc || descId,
              choices: localizeEnumChoices(choices, localizations),
            },
          ];
        }),
      )
    : undefined;
}

function resolveCommandReturnValues(
  retVals?: Record<string, CommandReturnValue>,
  localizations?: Record<string, DefinitionLocalization>,
): Record<string, LocalizedCommandReturnValue> | undefined {
  return retVals
    ? Object.fromEntries(
        Object.entries(retVals).map(([id, retVal]) => {
          const {
            "@name": nameId,
            "@description": descId,
            choices,
            ...toReturn
          } = retVal;

          const localizedName = localizations?.["en-US"]?.strings?.[nameId];
          const localizedDesc = descId
            ? localizations?.["en-US"]?.strings?.[descId]
            : undefined;

          return [
            id,
            {
              ...toReturn,
              name: localizedName || nameId,
              description: localizedDesc || descId,
              choices: localizeEnumChoices(choices, localizations),
            },
          ];
        }),
      )
    : undefined;
}

function localizeEnumChoices(
  choices?: EnumChoice[],
  localizations?: Record<string, DefinitionLocalization>,
): LocalizedEnumChoice[] | undefined {
  return choices
    ? choices.map((choice) => {
        const localizedName =
          localizations?.["en-US"]?.strings?.[choice["@name"]];
        return {
          name: localizedName || choice["@name"],
          id: choice.id,
        };
      })
    : undefined;
}
