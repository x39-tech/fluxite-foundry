import { fcDataTypes, FCDataType } from "app/persistentState";

const dataTypeFriendlyNames = Object.values(fcDataTypes).reduce(
  (previousValue, currentValue) => {
    if (currentValue === fcDataTypes.UUID) {
      return { [currentValue]: currentValue.toUpperCase(), ...previousValue };
    } else {
      return { [currentValue]: toTitleCase(currentValue), ...previousValue };
    }
  },
  {},
) as FriendlyNameMap<FCDataType>;

export function getDataTypeFriendlyName(key: FCDataType): string {
  return dataTypeFriendlyNames[key] || key;
}

// Utils

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type FriendlyNameMap<EnumType extends string> = Record<EnumType, string>;
