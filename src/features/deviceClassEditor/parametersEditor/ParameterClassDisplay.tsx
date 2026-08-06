import { getDataTypeFriendlyName } from "codex/util/enums";
import {
  formatCategoryPath,
  localizeCategoryPath,
  splitParameterClassId,
} from "codex/categories";
import { useCategoryCatalog } from "hooks/useCategoryCatalog";
import { useCurrentLocale } from "app/store";
import { SimplePropsTable } from "components/SimplePropsTable";
import { ResolvedParameterClass } from "../stateTransformations";
import { unitToString } from "utils/utils";

interface Props {
  paramClass: ResolvedParameterClass;
}

export const ParameterClassDisplay = ({ paramClass }: Props) => {
  const catalog = useCategoryCatalog();
  const locale = useCurrentLocale();

  const { category, identifier } = splitParameterClassId(paramClass.codexId);

  return (
    <SimplePropsTable name={paramClass.name.value} className="w-sm">
      <tr>
        <td>Description</td>
        <td>{paramClass.description?.value}</td>
      </tr>
      {category && (
        <tr>
          <td>Category</td>
          <td>
            {formatCategoryPath(
              localizeCategoryPath(catalog.localizations, category, locale),
            )}
          </td>
        </tr>
      )}
      <tr>
        <td>ID</td>
        <td>{identifier}</td>
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
