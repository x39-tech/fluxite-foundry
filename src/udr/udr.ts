import { DeviceClass } from "./objects/deviceClass";
import {
  Access,
  DeviceCategory,
  DeviceSubCategory,
  Lifetime,
} from "./util/enums";

export function getDefaultDeviceClass(): DeviceClass {
  const date = new Date();

  return {
    description: "Placeholder for Device Description",
    publishDate: `${date.getFullYear()}-${date.getMonth()}-${date.getDay()}`,
    author: "Firstname Lastname",
    history: {},
    structuredItems: {
      deviceIdentification: {
        class: "device-identification",
        access: Access.READONLY,
        lifetime: Lifetime.STATIC,
        default: {
          manufacturer: {
            name: "Manufacturer Inc.",
          },
          model: {
            name: "Super Light",
            productIdentifier: "superlight",
            category: DeviceCategory.LIGHTING,
            subcategory: DeviceSubCategory.MOVING_PROFILE,
          },
        },
      },
    },
  };
}
