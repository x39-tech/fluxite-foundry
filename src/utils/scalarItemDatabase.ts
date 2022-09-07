import { ScalarItemClass } from "udr/objects/itemClass";
import { allScalarItems } from "udr/libraries/scalarItems";

///////////////////////////////////////////////////////////////////////////////////////////////////
// Constants and data
///////////////////////////////////////////////////////////////////////////////////////////////////

const preferredLibraryOrder = [
  // "org.esta.lib.core.1",
  "org.esta.lib.intensity-color.1",
  // "org.esta.lib.motion.1",
  "org.esta.lib.gobo.1",
  // "org.esta.lib.shape.1",
  // "org.esta.lib.effects.1",
  // "org.esta.lib.media.1",
  // "org.esta.lib.other.1",
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

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Types
///////////////////////////////////////////////////////////////////////////////////////////////////

export interface ScalarItemClassWithId extends ScalarItemClass {
  qualifiedId: string;
  fullyQualifiedId: string;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

export function getAllScalarItemsWithIds(): ScalarItemClassWithId[] {
  return allScalarItemsWithIds;
}

export function constructFullyQualifiedId(
  libraryId: string,
  scalarItem: ScalarItemClass
): string {
  return `${libraryId}/${scalarItem.category}/${scalarItem.identifier}`;
}

export function lookupScalarItemClass(
  className: string
): ScalarItemClass | undefined {
  // Class string must consist of <qualified identifier>/<category>/<identifier>], where only
  // category can have additional forward slashes within it.
  const parts = className.split("/");
  if (parts.length < 3) {
    return undefined;
  }
  if (!(parts[0] in allScalarItems)) {
    return undefined;
  }

  const category = parts.slice(1, -1).join("/");

  return allScalarItems[parts[0] as keyof typeof allScalarItems].find(
    (scalarItemClass) => {
      return (
        scalarItemClass.category === category &&
        scalarItemClass.identifier === parts[parts.length - 1]
      );
    }
  );
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

  doInPreferredLibraryOrder((library, scalarItems) => {
    items = items.concat(addIdsToScalarItemClasses(library, scalarItems));
  });

  return items;
}

function doInPreferredLibraryOrder(
  fn: (libQualifiedId: string, scalarItems: ScalarItemClass[]) => void
) {
  for (const library of preferredLibraryOrder) {
    fn(library, allScalarItems[library]);
  }

  for (const [remainingLibrary, classArray] of Object.entries(
    allScalarItems
  ).filter(([key, _]) => {
    return !preferredLibraryOrder.includes(
      key as typeof preferredLibraryOrder[0]
    );
  })) {
    fn(remainingLibrary, classArray);
  }
}

function addIdsToScalarItemClasses(
  libraryName: string,
  scalarItemClasses: ScalarItemClass[]
): ScalarItemClassWithId[] {
  return scalarItemClasses.map((scalarItemClass) => {
    return {
      qualifiedId: libraryName,
      fullyQualifiedId: `${libraryName}/${scalarItemClass.category}/${scalarItemClass.identifier}`,
      ...scalarItemClass,
    };
  });
}
