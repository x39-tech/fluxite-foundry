import { ScalarItemClass } from "udr/objects/itemClass";
import { estaScalarItemsJson } from "./estaScalarItems";

type ScalarItemDatabase = { [key: string]: ScalarItemClass[] };

export const allScalarItems = loadScalarItems();

function loadScalarItems(): ScalarItemDatabase {
  const doc = JSON.parse(estaScalarItemsJson);
  return Object.entries(doc.e173.libraries).reduce(
    (previousValue, [libraryName, library]) => {
      return {
        [libraryName]: (library as { scalarItemClasses: ScalarItemClass[] })
          .scalarItemClasses,
        ...previousValue,
      };
    },
    {}
  );
}
