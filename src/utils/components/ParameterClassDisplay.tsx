import { HTMLTable } from "@blueprintjs/core";
import { getDataTypeFriendlyName } from "udr/util/enums";
import {
  ParameterClassWithId,
  getItemClassDescription,
  getItemClassName,
} from "udr/udrDatabase";
import { useUdrDatabase } from "app/state";
import { Unit } from "e173";

interface Props {
  paramClass: ParameterClassWithId;
}

export const ParameterClassDisplay = ({ paramClass }: Props) => {
  const database = useUdrDatabase();

  // TODO: Revisit this formatting, ideally tables should be sized reasonably to their contents
  return (
    <HTMLTable striped compact style={{ width: "400px" }}>
      <colgroup>
        <col span={1} style={{ width: "30%" }} />
        <col span={1} />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={2}>{getItemClassName(database, paramClass)}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Description</td>
          <td>{getItemClassDescription(database, paramClass)}</td>
        </tr>
        <tr>
          <td>ID</td>
          <td>{paramClass.id}</td>
        </tr>
        <tr>
          <td>Data Type</td>
          <td>
            {getDataTypeFriendlyName(paramClass.dataType) ||
              paramClass.dataType}
          </td>
        </tr>
        <tr>
          <td>Unit</td>
          <td>{unitToString(paramClass.unit)}</td>
        </tr>
      </tbody>
    </HTMLTable>
  );
};

function unitToString(unit: Unit | undefined): string {
  if (unit) {
    if (unit.exponent) {
      return `${unit.name} ^ ${unit.exponent}`;
    } else {
      return unit.name;
    }
  } else {
    return "N/A";
  }
}
