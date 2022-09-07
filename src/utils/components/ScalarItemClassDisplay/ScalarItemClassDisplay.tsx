import { HTMLTable } from "@blueprintjs/core";
import { ScalarItemClass } from "udr/objects/itemClass";

export interface ScalarItemClassDisplayProps {
  udr: ScalarItemClass;
}

export const ScalarItemClassDisplay: React.FC<ScalarItemClassDisplayProps> = ({
  udr,
}) => {
  // TODO: Revisit this formatting, ideally tables should be sized reasonably to their contents
  return (
    <HTMLTable striped condensed style={{ width: "400px" }}>
      <colgroup>
        <col span={1} style={{ width: "30%" }} />
        <col span={1} />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={2}>{udr.name}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Description</td>
          <td>{udr.description}</td>
        </tr>
        <tr>
          <td>Category</td>
          <td>{`${udr.category}`}</td>
        </tr>
        <tr>
          <td>ID</td>
          <td>{udr.identifier}</td>
        </tr>
        <tr>
          <td>Data Type</td>
          <td>{udr.dataType}</td>
        </tr>
        <tr>
          <td>Unit</td>
          <td>{udr.unit || "N/A"}</td>
        </tr>
        {udr.default !== undefined ? (
          <tr>
            <td>Default Value</td>
            <td>{udr.default}</td>
          </tr>
        ) : (
          <></>
        )}
      </tbody>
    </HTMLTable>
  );
};
