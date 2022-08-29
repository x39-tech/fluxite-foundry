import { Button, Divider } from "@blueprintjs/core";
import { useAppSelector } from "app/hooks";
import { ScalarItemEditor } from "./ScalarItemEditor";
import "./ScalarItemsEditor.scss";

export interface ScalarItemsEditorProps {
  onNewScalarItemClicked: () => void;
}

export const ScalarItemsEditor: React.FC<ScalarItemsEditorProps> = ({
  onNewScalarItemClicked,
}) => {
  const editorState = useAppSelector(
    (state) =>
      state.fixtureEditor.openEditors[state.fixtureEditor.selectedEditor]
  );

  const scalarItemEditors: Array<JSX.Element> = [];
  if (editorState.udr.scalarItems) {
    editorState.scalarItemEditors.forEach((editor) => {
      if (editor.udrId in editorState.udr.scalarItems!) {
        scalarItemEditors.push(
          <ScalarItemEditor
            key={editor.id}
            id={editor.udrId}
            udr={editorState.udr.scalarItems![editor.udrId]}
          />
        );
      }
    });
  }

  return (
    <div className="scalar-items-editor">
      <h2 className="scalar-items-editor-title">Scalar Items</h2>
      <Divider />
      {scalarItemEditors}
      <div className="add-scalar-item-section">
        <Button icon="plus" minimal={true} onClick={onNewScalarItemClicked} />
      </div>
    </div>
  );
};
