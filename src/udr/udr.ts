import {
  DeviceClass,
  Access,
  Lifetime,
  Category,
  Subcategory,
} from "generated/draft-2023-1/udr-document";

export function getDefaultDeviceClass(): DeviceClass {
  const date = new Date();

  return {
    "@description": "device_description",
    publishDate: `${date.getFullYear()}-${date.getMonth()}-${date.getDay()}`,
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
    localizations: {
      "en-US": {
        strings: {
          device_description: "Placeholder for Device Description",
        },
      },
    },
  };
}
