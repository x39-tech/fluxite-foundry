import { Divider } from "@blueprintjs/core";
import { DeviceIdentification } from "udr/libraries/core/structuredItems/deviceIdentification";
import { DeviceIdentificationEditor } from "./structuredItems/DeviceIdentificationEditor";
import "./StructuredItemsEditor.css";
import { useAppSelector } from "app/hooks";

const editorFactory = {
  deviceIdentification: (udr: DeviceIdentification, key: number) => {
    return <DeviceIdentificationEditor key={key} udr={udr} />;
  },
};

export const StructuredItemsEditor = () => {
  const { udr, structuredItemEditors } = useAppSelector((state) => {
    const activeEditor =
      state.fixtureEditor.openEditors[state.fixtureEditor.selectedEditor];

    return {
      udr: activeEditor.udr.structuredItems,
      structuredItemEditors: activeEditor.structuredItemEditors,
    };
  });

  const editors: Array<JSX.Element> = [];
  for (const [index, structuredItemName] of structuredItemEditors.entries()) {
    if (
      structuredItemName in editorFactory &&
      udr &&
      structuredItemName in udr
    ) {
      editors.push(
        editorFactory[structuredItemName as keyof typeof editorFactory](
          udr[structuredItemName].default!,
          index
        )
      );
    }
  }

  return (
    <div className="structured-items-editor">
      <h2 className="structured-items-editor-title">Structured Items</h2>
      <Divider />
      <div className="structured-items-editor-container">{editors}</div>
    </div>
  );
};
