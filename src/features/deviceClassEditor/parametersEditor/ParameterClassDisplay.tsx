import { getDataTypeFriendlyName } from "codex/util/enums";
import { SimplePropsTable } from "components/SimplePropsTable";
import { ResolvedParameterClass } from "../stateTransformations";
import { unitToString } from "utils/utils";

interface Props {
  paramClass: ResolvedParameterClass;
}

export const ParameterClassDisplay = ({ paramClass }: Props) => {
  return (
    <SimplePropsTable name={paramClass.name.value} className="w-sm">
      <tr>
        <td>Description</td>
        <td>{paramClass.description?.value}</td>
      </tr>
      <tr>
        <td>ID</td>
        <td>{paramClass.codexId}</td>
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
