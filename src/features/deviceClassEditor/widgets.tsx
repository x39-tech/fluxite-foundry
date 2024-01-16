import { ParametersEditor } from "./parametersEditor/ParametersEditor";
import { StructuresEditor } from "./structuresEditor/StructuresEditor";
import { DeviceInfoEditor } from "./deviceInfoEditor/DeviceInfoEditor";

interface EditorWidget {
  name: string;
  description: string;
  factory: () => JSX.Element;
}

export const WIDGETS: Record<string, EditorWidget> = {
  parametersEditor: {
    name: "Parameters Editor",
    description: "Create and edit parameters for the device class",
    factory: () => <ParametersEditor />,
  },
  structuresEditor: {
    name: "Structures Editor",
    description: "Create and edit structures for the device class",
    factory: () => <StructuresEditor />,
  },
  deviceInfoEditor: {
    name: "Device Info Editor",
    description: "Edit basic device information",
    factory: () => <DeviceInfoEditor />,
  },
};

export function isValidWidget(name: string): name is keyof typeof WIDGETS {
  return name in WIDGETS;
}
