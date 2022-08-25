import { ScalarItemClass } from "udr/objects/itemClass";
import { DataType, Unit } from "udr/util/enums";
import { generateScalarItemCategoryMap } from "../scalarItemLibraryUtils";

// TODO: Import these from the library JSON.

export const intensityColorScalarItems: ScalarItemClass[] = [
  {
    identifier: "dimmer",
    name: "Dimmer",
    category: "intensity",
    description:
      "The level of one or more emitters using a faded style. 0.0 = No output, 1.0 = Maximum output",
    dataType: DataType.NUMBER,
    unit: Unit.PERCENT,
    default: 0,
  },
  {
    identifier: "shutter",
    name: "Shutter",
    category: "intensity",
    description:
      "The level of one or more emitters using an open/closed style. 0 = Closed, 1 = Open",
    dataType: DataType.BOOLEAN,
    default: true,
  },
];

export const intensityColorScalarItemsByCategory =
  generateScalarItemCategoryMap(intensityColorScalarItems);
