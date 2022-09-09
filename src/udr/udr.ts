import { getDefaultDeviceIdentification } from "./libraries/core/structuredItems/deviceIdentification";
import { DeviceClass } from "./objects/deviceClass";
import { Access, Lifetime } from "./util/enums";

export function getDefaultDeviceClass(): DeviceClass {
  const date = new Date();

  return {
    description: "Placeholder for Device Description",
    publishDate: `${date.getFullYear()}-${date.getMonth()}-${date.getDay()}`,
    author: "Firstname Lastname",
    history: {},
    scalarItems: {
      "main-dimmer": {
        class: "org.esta.lib.intensity-color.1/intensity/dimmer",
        friendlyName: "Main Dimmer",
        access: Access.READWRITE,
        lifetime: Lifetime.RUNTIME,
        minimum: 0,
        maximum: 1,
      },
    },
    structuredItems: {
      deviceIdentification: getDefaultDeviceIdentification(),
    },
  };
}
