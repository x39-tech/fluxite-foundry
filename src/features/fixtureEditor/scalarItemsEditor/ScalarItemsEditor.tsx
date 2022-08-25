import { Button, Divider } from "@blueprintjs/core";
import { useAppSelector } from "app/hooks";
import { ScalarItemEditor } from "./ScalarItemEditor";
import "./ScalarItemsEditor.scss";

export const ScalarItemsEditor = () => {
  const udr = useAppSelector(
    (state) =>
      state.fixtureEditor.openEditors[state.fixtureEditor.selectedEditor].udr
        .scalarItems
  );

  return (
    <div className="scalar-items-editor">
      <h2 className="scalar-items-editor-title">Scalar Items</h2>
      <Divider />
      {udr ? (
        Object.entries(udr!).map(([id, item]) => {
          return <ScalarItemEditor key={id} id={id} udr={item} />;
        })
      ) : (
        <></>
      )}
      <div className="add-scalar-item-section">
        <Button icon="plus" minimal={true} />
      </div>
    </div>
  );
};
