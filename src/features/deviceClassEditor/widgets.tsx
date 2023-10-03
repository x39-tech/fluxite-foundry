import { UdrDatabase } from "udr/udrDatabase";
import { ParametersEditor } from "./parametersEditor/ParametersEditor";
import { StructuresEditor } from "./structuresEditor/StructuresEditor";
import { DeviceInfoEditor } from "./deviceInfoEditor/DeviceInfoEditor";

interface EditorWidget {
  name: string;
  description: string;
  factory: (database: UdrDatabase) => JSX.Element;
}

export const WIDGETS: Record<string, EditorWidget> = {
  parametersEditor: {
    name: "Parameters Editor",
    description: "Create and edit parameters for the device class",
    factory: (database) => <ParametersEditor database={database} />,
  },
  structuresEditor: {
    name: "Structures Editor",
    description: "Create and edit structures for the device class",
    factory: (database) => <StructuresEditor database={database} />,
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
