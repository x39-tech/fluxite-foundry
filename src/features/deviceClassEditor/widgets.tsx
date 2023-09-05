import { ParametersEditor } from "./parametersEditor/ParametersEditor";
import { StructuresEditor } from "./structuresEditor/StructuresEditor";

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
};

export function isValidWidget(name: string): name is keyof typeof WIDGETS {
  return name in WIDGETS;
}
