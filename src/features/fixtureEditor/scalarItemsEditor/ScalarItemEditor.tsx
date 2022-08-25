import { Button, Collapse, EditableText, HTMLTable } from "@blueprintjs/core";
import { useState } from "react";
import { ScalarItem } from "udr/objects/item";
import "./ScalarItemEditor.scss";

export interface ScalarItemEditorProps {
  id: string;
  udr: ScalarItem;
}

export const ScalarItemEditor: React.FC<ScalarItemEditorProps> = ({
  id,
  udr,
}) => {
  const [isExpanded, setExpanded] = useState(false);

  return (
    <div className="scalar-item-editor">
      <div className="scalar-item-title-section">
        <Button
          icon={isExpanded ? "minus" : "plus"}
          minimal={true}
          style={{ opacity: 0.8 }}
          onClick={() => setExpanded(!isExpanded)}
        />
        <h3 className="scalar-item-title">
          {udr.friendlyName ? udr.friendlyName! : id}
        </h3>
      </div>
      <Collapse isOpen={isExpanded}>
        <div className="scalar-item-collapse-body">
          <HTMLTable striped>
            <colgroup>
              <col span={1} style={{ width: "25%" }} />
              <col span={1} />
            </colgroup>
            <thead></thead>
            <tbody>
              <tr>
                <td>Class</td>
                <td>
                  <pre>{udr.class}</pre>
                </td>
              </tr>
              <tr>
                <td>Minimum Value</td>
                <td>
                  <EditableText defaultValue={`${udr.minimum}`} />
                </td>
              </tr>
              <tr>
                <td>Maximum Value</td>
                <td>
                  <EditableText defaultValue={`${udr.maximum}`} />
                </td>
              </tr>
            </tbody>
          </HTMLTable>
        </div>
      </Collapse>
    </div>
  );
};
