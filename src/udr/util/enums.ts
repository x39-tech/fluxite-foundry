import {
  Access,
  Lifetime,
  DataType,
} from "generated/draft-2023-1/udr-document";

const accessFriendlyNames: FriendlyNameMap<Access> = {
  [Access.READONLY]: "Read-Only",
  [Access.READWRITE]: "Read-Write",
};

export function getAccessFriendlyName(key: Access): string {
  return accessFriendlyNames[key] || key;
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
    if (currentValue === DataType.UUID) {
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
