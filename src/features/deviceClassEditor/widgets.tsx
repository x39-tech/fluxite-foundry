import { JSX } from "react";
import { ParametersEditor } from "./parametersEditor/ParametersEditor";
import { DeviceInfoEditor } from "./deviceInfoEditor/DeviceInfoEditor";
import { DmxEditor } from "./dmxEditor/DmxEditor";
import { DmxController } from "./controller/DmxController";

interface EditorWidget {
  name: string;
  description: string;
  factory: () => JSX.Element;
}

export const WIDGETS: Record<string, EditorWidget> = {
  parametersEditor: {
    name: "Parameters",
    description: "Create and edit parameters for the device class",
    factory: () => <ParametersEditor />,
  },
  deviceInfoEditor: {
    name: "Device Info",
    description: "Edit basic device information",
    factory: () => <DeviceInfoEditor />,
  },
  dmxEditor: {
    name: "DMX Footprint",
    description: "Edit the DMX footprint of the device class",
    factory: () => <DmxEditor />,
  },
  dmxController: {
    name: "Test DMX Controller",
    description: "Test the device class with a virtual controller",
    factory: () => <DmxController />,
  },
};

export function isValidWidget(name: string): name is keyof typeof WIDGETS {
  return name in WIDGETS;
}
