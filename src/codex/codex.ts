import { useAppRuntimeStore } from "app/store";
import dayjs from "dayjs";
import {
  DeviceClass,
  Lifetime,
  Category,
  Subcategory,
  ParameterAccess,
} from "e173";
import { getNewestVersionOfEachLibrary } from "./codexDatabase";

const DEFAULT_AUTHOR = "Firstname Lastname";
const DEFAULT_COMPANY = "ACME Inc.";

export function getDefaultDeviceClass(deviceClassId: string): DeviceClass {
  const modelName = toTitleCase(deviceClassId.replaceAll("-", " "));

  const libraries = getNewestVersionOfEachLibrary(
    useAppRuntimeStore.getState().codexDatabase,
  ).reduce<Record<string, string>>((acc, lib) => {
    acc[lib.id] = lib.version;
    return acc;
  }, {});

  return {
    "@description": "device_class_description",
    publishDate: dayjs().format("YYYY-MM-DD"),
    author: DEFAULT_AUTHOR,
    history: {},
    info: {
      manufacturer: {
        name: DEFAULT_COMPANY,
      },
      model: {
        name: modelName,
        category: Category.Lighting,
        subcategory: Subcategory.MovingProfile,
      },
    },
    libraries,
    parameters: {
      "main-dimmer": {
        library: "org.esta.lib.intensity-color",
        class: "intensity/dimmer",
        "@friendlyName": "parameter_main-dimmer",
        access: [ParameterAccess.ReadActual, ParameterAccess.Write],
        lifetime: Lifetime.Runtime,
        minimum: 0,
        maximum: 1,
      },
    },
    localizations: {
      "en-US": {
        strings: {
          device_class_description: `A really cool device from ${DEFAULT_COMPANY}`,
          "parameter_main-dimmer": "Main Dimmer",
        },
      },
    },
  };
}

function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
