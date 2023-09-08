import { HTMLTable } from "@blueprintjs/core";
import {
  StructureClassWithId,
  UdrDatabase,
  getItemClassDescription,
  getItemClassName,
} from "udr/udrDatabase";

interface Props {
  udr: StructureClassWithId;
  database: UdrDatabase;
}

export const StructureClassDisplay = ({ udr, database }: Props) => {
  // TODO: Revisit this formatting, ideally tables should be sized reasonably to their contents
  return (
    <HTMLTable striped condensed style={{ width: "400px" }}>
      <colgroup>
        <col span={1} style={{ width: "30%" }} />
        <col span={1} />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={2}>{getItemClassName(database, udr)}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Description</td>
          <td>{getItemClassDescription(database, udr)}</td>
        </tr>
        <tr>
          <td>ID</td>
          <td>{udr.id}</td>
        </tr>
      </tbody>
    </HTMLTable>
  );
};
