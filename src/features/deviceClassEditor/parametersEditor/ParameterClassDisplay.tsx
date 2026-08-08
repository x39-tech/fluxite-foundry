import { Trans } from "@lingui/react/macro";
import { getDataTypeFriendlyName } from "codex/util/enums";
import {
  formatCategoryPath,
  localizeCategoryPath,
  splitParameterClassId,
} from "codex/categories";
import { useCategoryCatalog } from "hooks/useCategoryCatalog";
import { useAuthoringLocale } from "app/store";
import { SimplePropsTable } from "components/SimplePropsTable";
import { ResolvedParameterClass } from "../stateTransformations";
import { unitToString } from "utils/utils";

interface Props {
  paramClass: ResolvedParameterClass;
}

export const ParameterClassDisplay = ({ paramClass }: Props) => {
  const catalog = useCategoryCatalog();
  const locale = useAuthoringLocale();

  const { category, identifier } = splitParameterClassId(paramClass.codexId);

  return (
    <SimplePropsTable name={paramClass.name.value} className="w-sm">
      <tr>
        <td>
          <Trans id="deviceClassEditor.paramClassDisplay.description">
            Description
          </Trans>
        </td>
        <td>{paramClass.description?.value}</td>
      </tr>
      {category && (
        <tr>
          <td>
            <Trans id="deviceClassEditor.paramClassDisplay.category">
              Category
            </Trans>
          </td>
          <td>
            {formatCategoryPath(
              localizeCategoryPath(catalog.localizations, category, locale),
            )}
          </td>
        </tr>
      )}
      <tr>
        <td>
          <Trans id="deviceClassEditor.paramClassDisplay.id">ID</Trans>
        </td>
        <td>{identifier}</td>
      </tr>
      <tr>
        <td>
          <Trans id="deviceClassEditor.paramClassDisplay.dataType">
            Data Type
          </Trans>
        </td>
        <td>
          {getDataTypeFriendlyName(paramClass.dataType) || paramClass.dataType}
        </td>
      </tr>
      <tr>
        <td>
          <Trans id="deviceClassEditor.paramClassDisplay.unit">Unit</Trans>
        </td>
        <td>{unitToString(paramClass.unit)}</td>
      </tr>
    </SimplePropsTable>
  );
};
