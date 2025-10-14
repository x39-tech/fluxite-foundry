import { Unit } from "e173";
import { getDataTypeFriendlyName } from "udr/util/enums";
import { ResolvedParameterClass } from "udr/udrDatabase";
import { SimplePropsTable } from "components/SimplePropsTable";

interface Props {
  paramClass: ResolvedParameterClass;
}

export const ParameterClassDisplay = ({ paramClass }: Props) => {
  return (
    <SimplePropsTable name={paramClass.name} className="w-sm">
      <tr>
        <td>Description</td>
        <td>{paramClass.description}</td>
      </tr>
      <tr>
        <td>ID</td>
        <td>{paramClass.id}</td>
      </tr>
      <tr>
        <td>Data Type</td>
        <td>
          {getDataTypeFriendlyName(paramClass.dataType) || paramClass.dataType}
        </td>
      </tr>
      <tr>
        <td>Unit</td>
        <td>{unitToString(paramClass.unit)}</td>
      </tr>
    </SimplePropsTable>
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
