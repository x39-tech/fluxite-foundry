import { ScalarItemClass } from "udr/objects/itemClass";
import { goboScalarItems, goboScalarItemsByCategory } from "./gobo/scalarItems";
import {
  intensityColorScalarItems,
  intensityColorScalarItemsByCategory,
} from "./intensityColor/scalarItems";

export const allScalarItems = {
  "org.esta.lib.intensity-color.1": intensityColorScalarItems,
  "org.esta.lib.gobo.1": goboScalarItems,
};

export const allScalarItemsByCategory = {
  "org.esta.lib.intensity-color.1": intensityColorScalarItemsByCategory,
  "org.esta.lib.gobo.1": goboScalarItemsByCategory,
};

export function getScalarItemClass(
  className: string
): ScalarItemClass | undefined {
  // Class string must consist of <qualified identifier>/<category>/<identifier>], where only
  // category can have additional forward slashes within it.
  const parts = className.split("/");
  if (parts.length < 3) {
    return undefined;
  }
  if (!(parts[0] in allScalarItemsByCategory)) {
    return undefined;
  }

  const scalarItemCategoryMap =
    allScalarItemsByCategory[parts[0] as keyof typeof allScalarItemsByCategory];

  const category = parts.slice(1, -1).join("/");
  if (!(category in scalarItemCategoryMap)) {
    return undefined;
  }

  const scalarItemArray = scalarItemCategoryMap[category];
  return scalarItemArray.find((scalarItemClass) => {
    return scalarItemClass.identifier === parts[parts.length - 1];
  });
}
