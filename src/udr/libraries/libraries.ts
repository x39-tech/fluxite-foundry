import {
  ItemClass,
  ScalarItemClass,
  StructuredItemClass,
} from "udr/objects/itemClass";
import allEstaLibraries from "./estaLibraries.json";

export interface ItemDatabase<ClassType extends ItemClass> {
  [key: string]: ClassType[];
}

type ScalarItemDatabase = ItemDatabase<ScalarItemClass>;
type StructuredItemDatabase = ItemDatabase<StructuredItemClass>;

export const allScalarItems = loadScalarItems();
export const allStructuredItems = loadStructuredItems();

function loadScalarItems(): ScalarItemDatabase {
  return Object.entries(allEstaLibraries.e173.libraries).reduce(
    (previousValue, [libraryName, library]) => {
      const typedLibrary = library as { scalarItemClasses: ScalarItemClass[] };
      if (typedLibrary.scalarItemClasses) {
        return {
          [libraryName]: typedLibrary.scalarItemClasses,
          ...previousValue,
        };
      }
      return previousValue;
    },
    {}
  );
}

function loadStructuredItems(): StructuredItemDatabase {
  return Object.entries(allEstaLibraries.e173.libraries).reduce(
    (previousValue, [libraryName, library]) => {
      const typedLibrary = library as {
        structuredItemClasses: StructuredItemClass[];
      };
      if (typedLibrary.structuredItemClasses) {
        return {
          [libraryName]: typedLibrary.structuredItemClasses,
          ...previousValue,
        };
      }
      return previousValue;
    },
    {}
  );
}
