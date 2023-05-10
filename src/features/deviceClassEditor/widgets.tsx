import { ScalarItemsEditor } from "./scalarItemsEditor/ScalarItemsEditor";
import { StructuredItemsEditor } from "./structuredItemsEditor/StructuredItemsEditor";

interface EditorWidget {
  name: string;
  description: string;
  factory: () => JSX.Element;
}

export const WIDGETS: Record<string, EditorWidget> = {
  scalarItemsEditor: {
    name: "Scalar Items Editor",
    description: "Create and edit scalar items for the device class",
    factory: () => <ScalarItemsEditor />,
  },
  structuredItemsEditor: {
    name: "Structured Items Editor",
    description: "Create and edit structured items for the device class",
    factory: () => <StructuredItemsEditor />,
  },
};

export function isValidWidget(name: string): name is keyof typeof WIDGETS {
  return name in WIDGETS;
}
