import { Access, Lifetime, DataType, ParameterAccess } from "e173";

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

const dataTypeFriendlyNames = Object.values(DataType).reduce(
  (previousValue, currentValue) => {
    if (currentValue === DataType.Uuid) {
      return { [currentValue]: currentValue.toUpperCase(), ...previousValue };
    } else {
      return { [currentValue]: toTitleCase(currentValue), ...previousValue };
    }
  },
  {},
) as FriendlyNameMap<DataType>;

export function getDataTypeFriendlyName(key: DataType): string {
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
