import { Access, Lifetime, ParameterAccess } from "e173";
import { fcDataTypes, FCDataType } from "app/persistentState";

const accessFriendlyNames: FriendlyNameMap<Access> = {
  [Access.Read]: "Read",
  [Access.Write]: "Write",
};

export function getAccessFriendlyName(key: Access): string {
  return accessFriendlyNames[key] || key;
}

const paramAccessFriendlyNames: FriendlyNameMap<ParameterAccess> = {
  [ParameterAccess.ReadActual]: "Read Actual",
  [ParameterAccess.ReadTarget]: "Read Target",
  [ParameterAccess.Write]: "Write",
};

export function getParamAccessFriendlyName(key: ParameterAccess): string {
  return paramAccessFriendlyNames[key] || key;
}

const lifetimeFriendlyNames = Object.values(Lifetime).reduce(
  (previousValue, currentValue) => {
    return { [currentValue]: toTitleCase(currentValue), ...previousValue };
  },
  {},
) as FriendlyNameMap<Lifetime>;

export function getLifetimeFriendlyName(key: Lifetime): string {
  return lifetimeFriendlyNames[key] || key;
}

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
