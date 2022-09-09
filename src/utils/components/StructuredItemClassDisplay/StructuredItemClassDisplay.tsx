import { HTMLTable } from "@blueprintjs/core";
import { StructuredItemClass } from "udr/objects/itemClass";

export interface StructuredItemClassDisplayProps {
  udr: StructuredItemClass;
}

export const StructuredItemClassDisplay: React.FC<
  StructuredItemClassDisplayProps
> = ({ udr }) => {
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
      </tbody>
    </HTMLTable>
  );
};
