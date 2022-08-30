import { ScalarItemClass } from "udr/objects/itemClass";
import { DataType, Unit } from "udr/util/enums";

// TODO: Import these from the library JSON.

export const goboScalarItems: ScalarItemClass[] = [
  {
    identifier: "index",
    name: "Index",
    category: "gobo/select",
    description: "The position within a series of gobos",
    dataType: DataType.NUMBER,
    unit: Unit.UNITLESS,
    default: 0,
  },
  {
    identifier: "spin",
    name: "Spin",
    category: "gobo/rotate",
    description: "The continuous rotation of a gobo around a single axis",
    dataType: DataType.NUMBER,
    unit: Unit.RPM,
    default: 0,
  },
];
