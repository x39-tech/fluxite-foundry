import dayjs from "dayjs";
import {
  DeviceClass,
  Access,
  Lifetime,
  Category,
  Subcategory,
} from "generated/draft-2023-1/udr-document";

export function getDefaultDeviceClass(): DeviceClass {
  return {
    "@description": "A really cool device from ACME Inc.",
    publishDate: dayjs().format("YYYY-MM-DD"),
    author: "Firstname Lastname",
    history: {},
    info: {
      manufacturer: {
        name: "ACME Inc.",
      },
      model: {
        name: "Super Light",
        productIdentifier: "superlight",
        category: Category.LIGHTING,
        subcategory: Subcategory.MOVING_PROFILE,
      },
    },
    libraries: {
      "org.esta.lib.intensity-color": "1.0.0",
    },
    parameters: {
      "main-dimmer": {
        class: "org.esta.lib.intensity-color#1.0.0/intensity/dimmer",
        "@friendlyName": "Main Dimmer",
        access: Access.READWRITE,
        lifetime: Lifetime.RUNTIME,
        minimum: 0,
        maximum: 1,
      },
    },
  };
}
