import { HTMLTable } from "@blueprintjs/core";
import { getDataTypeFriendlyName } from "udr/util/enums";
import {
  ParameterClassWithId,
  getItemClassDescription,
  getItemClassName,
} from "udr/udrDatabase";

interface Props {
  udr: ParameterClassWithId;
}

export const ParameterClassDisplay = ({ udr }: Props) => {
  // TODO: Revisit this formatting, ideally tables should be sized reasonably to their contents
  return (
    <HTMLTable striped compact style={{ width: "400px" }}>
      <colgroup>
        <col span={1} style={{ width: "30%" }} />
        <col span={1} />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={2}>{getItemClassName(udr)}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Description</td>
          <td>{getItemClassDescription(udr)}</td>
        </tr>
        <tr>
          <td>ID</td>
          <td>{udr.id}</td>
        </tr>
        <tr>
          <td>Data Type</td>
          <td>{getDataTypeFriendlyName(udr.dataType) || udr.dataType}</td>
        </tr>
        <tr>
          <td>Unit</td>
          <td>{udr.unit || "N/A"}</td>
        </tr>
      </tbody>
    </HTMLTable>
  );
};
