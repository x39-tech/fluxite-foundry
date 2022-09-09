import {
  ItemClass,
  ScalarItemClass,
  StructuredItemClass,
} from "udr/objects/itemClass";
import {
  allScalarItems,
  allStructuredItems,
  ItemDatabase,
} from "udr/libraries/libraries";
import {
  DEVICE_IDENTIFICATION_CLASS,
  getDefaultDeviceIdentification,
} from "udr/libraries/core/structuredItems/deviceIdentification";
import { StructuredItem } from "udr/objects/item";

///////////////////////////////////////////////////////////////////////////////////////////////////
// Constants and data
///////////////////////////////////////////////////////////////////////////////////////////////////

const preferredLibraryOrder = [
  "org.esta.lib.core.1",
  "org.esta.lib.intensity-color.1",
  "org.esta.lib.motion.1",
  "org.esta.lib.gobo.1",
  "org.esta.lib.shape.1",
  "org.esta.lib.effects.1",
  "org.esta.lib.media.1",
  "org.esta.lib.other.1",
];

const qualifiedIdFriendlyNames = {
  "org.esta.lib.core.1": "ESTA Core Library",
  "org.esta.lib.intensity-color.1": "ESTA Intensity/Color Library",
  "org.esta.lib.motion.1": "ESTA Motion Library",
  "org.esta.lib.gobo.1": "ESTA Gobo Library",
  "org.esta.lib.shape.1": "ESTA Shape Library",
  "org.esta.lib.effects.1": "ESTA Effects Library",
  "org.esta.lib.other.1": "ESTA Other/Uncategorized Library",
  "org.esta.lib.media.1": "ESTA Media Library",
};

const allScalarItemsWithIds = generateAllScalarItemsWithIds();

const allStructuredItemsWithIds = generateAllStructuredItemsWithIds();

const defaultStructuredItemFactory = {
  [DEVICE_IDENTIFICATION_CLASS]: getDefaultDeviceIdentification,
};

const structuredItemMaxCounts = {
  [DEVICE_IDENTIFICATION_CLASS]: 1,
};

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Types
///////////////////////////////////////////////////////////////////////////////////////////////////

export interface ItemClassWithId {
  qualifiedId: string;
  fullyQualifiedId: string;
}

export type ScalarItemClassWithId = ScalarItemClass & ItemClassWithId;

export type StructuredItemClassWithId = StructuredItemClass & ItemClassWithId;

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

export function getAllScalarItemsWithIds(): ScalarItemClassWithId[] {
  return allScalarItemsWithIds;
}

export function getAllStructuredItemsWithIds(): StructuredItemClassWithId[] {
  return allStructuredItemsWithIds;
}

export function getDefaultStructuredItemFactory(): {
  [key: string]: () => StructuredItem;
} {
  return defaultStructuredItemFactory;
}

export function getStructuredItemMaxCounts(): {
  [key: string]: number;
} {
  return structuredItemMaxCounts;
}

export function constructFullyQualifiedId(
  libraryId: string,
  itemClass: ItemClass
): string {
  return itemClass.category
    ? `${libraryId}/${itemClass.category}/${itemClass.identifier}`
    : `${libraryId}/${itemClass.identifier}`;
}

export function lookupScalarItemClass(
  className: string
): ScalarItemClass | undefined {
  return lookupItemClass(className, allScalarItems);
}

export function lookupStructuredItemClass(
  className: string
): StructuredItemClass | undefined {
  return lookupItemClass(className, allStructuredItems);
}

export function getQualifiedIdFriendlyName(
  qualifiedId: string
): string | undefined {
  return qualifiedIdFriendlyNames[
    qualifiedId as keyof typeof qualifiedIdFriendlyNames
  ];
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

function generateAllScalarItemsWithIds(): ScalarItemClassWithId[] {
  let items: ScalarItemClassWithId[] = [];

  doInPreferredLibraryOrder(allScalarItems, (library, scalarItems) => {
    items = items.concat(addIdsToItemClasses(library, scalarItems));
  });

  return items;
}

function generateAllStructuredItemsWithIds(): StructuredItemClassWithId[] {
  let items: StructuredItemClassWithId[] = [];

  doInPreferredLibraryOrder(allStructuredItems, (library, scalarItems) => {
    items = items.concat(addIdsToItemClasses(library, scalarItems));
  });

  return items;
}

function doInPreferredLibraryOrder<ClassType extends ItemClass>(
  database: ItemDatabase<ClassType>,
  fn: (libQualifiedId: string, itemClasses: ClassType[]) => void
) {
  for (const library of preferredLibraryOrder) {
    if (library in database) {
      fn(library, database[library]);
    }
  }

  for (const [remainingLibrary, classArray] of Object.entries(database).filter(
    ([key, _]) => {
      return !preferredLibraryOrder.includes(key);
    }
  )) {
    fn(remainingLibrary, classArray);
  }
}

function addIdsToItemClasses<ClassType extends ItemClass>(
  libraryName: string,
  itemClasses: ClassType[]
): (ClassType & ItemClassWithId)[] {
  return itemClasses.map((itemClass) => {
    return {
      qualifiedId: libraryName,
      fullyQualifiedId: constructFullyQualifiedId(libraryName, itemClass),
      ...itemClass,
    };
  });
}

function lookupItemClass<ClassType extends ItemClass>(
  className: string,
  classDatabase: ItemDatabase<ClassType>
): ClassType | undefined {
  // Class string must consist of <qualified identifier>/<category>/<identifier>], where only
  // category can have additional forward slashes within it.
  const parts = className.split("/");
  if (parts.length < 3) {
    return undefined;
  }
  if (!(parts[0] in classDatabase)) {
    return undefined;
  }

  const category = parts.slice(1, -1).join("/");

  return classDatabase[parts[0] as keyof typeof classDatabase].find(
    (itemClass) => {
      return (
        itemClass.category === category &&
        itemClass.identifier === parts[parts.length - 1]
      );
    }
  );
}
