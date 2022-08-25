import { ScalarItemClass } from "udr/objects/itemClass";

export type ScalarItemsByCategory = {
  [key: string]: ScalarItemClass[];
};

export function generateScalarItemCategoryMap(
  scalarItemArray: ScalarItemClass[]
): ScalarItemsByCategory {
  return scalarItemArray.reduce((result: ScalarItemsByCategory, value) => {
    if (value.category in result) {
      result[value.category].push(value);
    } else {
      result[value.category] = [value];
    }
    return result;
  }, {});
}
