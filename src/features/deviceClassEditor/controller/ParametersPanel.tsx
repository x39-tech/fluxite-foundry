import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useId, useMemo, useState } from "react";
import { DriverParamValue } from "@cpwg-community/delver";
import { InfoIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import { fcDataTypes } from "app/persistentState";
import { useAuthoringLocale } from "app/store";
import { localizeCategory } from "codex/categories";
import { NumberInput } from "components/NumberInput";
import { Button } from "components/scn-ui/Button";
import { Input } from "components/scn-ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/scn-ui/Select";
import { Slider } from "components/scn-ui/Slider";
import { Switch } from "components/scn-ui/Switch";
import { ToggleGroup, ToggleGroupItem } from "components/scn-ui/ToggleGroup";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import { useCategoryCatalog } from "hooks/useCategoryCatalog";
import { cn } from "utils/utils";
import { MappableParameter } from "../dmxEditor/state";
import {
  ALL_CATEGORIES,
  availableCategoryFilters,
  CategoryFilter,
  filterCategory,
  matchesCategoryFilter,
  OTHER_CATEGORIES,
  topLevelCategories,
} from "./parameterCategories";
import {
  getBooleanValue,
  getNumericValue,
  getParameterCount,
  getResetValue,
  getSliderStepSize,
  getUnitString,
  ParamStates,
  serializeParamRef,
} from "./parameterValues";
import { SELECTED_ITEM } from "./styles";

const MESSAGES = {
  search: msg({
    id: "deviceClassEditor.dmxController.parameters.search",
    message: "Search Parameters",
  }),
  categories: msg({
    id: "deviceClassEditor.dmxController.parameters.categories",
    message: "Categories",
  }),
  allCategories: msg({
    id: "deviceClassEditor.dmxController.parameters.allCategories",
    message: "All",
  }),
  otherCategories: msg({
    id: "deviceClassEditor.dmxController.parameters.otherCategories",
    message: "Other",
  }),
  instanceLabel: msg({
    id: "deviceClassEditor.dmxController.parameters.instanceLabel",
    message: "{name} [{index}]",
  }),
  resetToDefault: msg({
    id: "deviceClassEditor.dmxController.parameters.resetToDefault",
    message: "Reset to Default",
  }),
};

/** Sets one instance of a parameter. */
export type ParamChangeHandler = (
  paramId: string,
  paramIndex: number | undefined,
  value: DriverParamValue,
) => void;

interface ParametersPanelProps {
  mappableParams: MappableParameter[];
  paramStates: ParamStates;
  // The states the driver started with, which resetting returns to.
  initialParamStates: ParamStates;
  onParamChange: ParamChangeHandler;
  onResetAll: () => void;
  className?: string;
}

// One row of the table: one instance of a parameter.
interface ParameterRow {
  key: string;
  mappable: MappableParameter;
  index: number | undefined;
  label: string;
}

/** The live controls for each valid parameter in the test controller. */
export const ParametersPanel = ({
  mappableParams,
  paramStates,
  initialParamStates,
  onParamChange,
  onResetAll,
  className,
}: ParametersPanelProps) => {
  const { _ } = useLingui();
  const headingId = useId();
  const locale = useAuthoringLocale();
  const catalog = useCategoryCatalog();
  const [searchText, setSearchText] = useState("");
  const [selectedFilter, setSelectedFilter] =
    useState<CategoryFilter>(ALL_CATEGORIES);

  const knownCategories = useMemo(() => topLevelCategories(catalog), [catalog]);

  const filters = availableCategoryFilters(
    mappableParams.map((mappable) => mappable.paramClass.codexId),
    knownCategories,
  );
  // If a category that was selected is no longer available, e.g. when its last
  // parameter is deleted, we fall back to showing all.
  const filter = filters.includes(selectedFilter)
    ? selectedFilter
    : ALL_CATEGORIES;

  const filterLabel = (option: CategoryFilter): string => {
    if (option === ALL_CATEGORIES) {
      return _(MESSAGES.allCategories);
    }
    if (option === OTHER_CATEGORIES) {
      return _(MESSAGES.otherCategories);
    }
    const category = filterCategory(option) ?? "";
    return localizeCategory(catalog.localizations, category, locale).value;
  };

  const search = searchText.trim().toLocaleLowerCase();
  const rows = parameterRows(mappableParams, (name, index) =>
    _({ ...MESSAGES.instanceLabel, values: { name, index } }),
  ).filter(
    (row) =>
      matchesCategoryFilter(
        row.mappable.paramClass.codexId,
        filter,
        knownCategories,
      ) &&
      (search === "" ||
        row.label.toLocaleLowerCase().includes(search) ||
        row.mappable.param.codexId.toLocaleLowerCase().includes(search)),
  );

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex min-h-0 flex-col gap-3 rounded-lg border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="font-semibold">
          <Trans id="deviceClassEditor.dmxController.parameters.title">
            Parameters
          </Trans>
        </h2>
        <Button variant="outline" size="sm" onClick={onResetAll}>
          <RotateCcwIcon />
          <Trans id="deviceClassEditor.dmxController.parameters.resetAll">
            Reset Values to Defaults
          </Trans>
        </Button>
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          className="h-8 pl-8"
          aria-label={_(MESSAGES.search)}
          placeholder={_(MESSAGES.search)}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </div>

      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        spacing={2}
        className="w-full flex-wrap"
        aria-label={_(MESSAGES.categories)}
        value={filter}
        // Choosing the selected filter again would clear the selection.
        onValueChange={(value) =>
          value && setSelectedFilter(value as CategoryFilter)
        }
      >
        {filters.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            className={cn("rounded-full", SELECTED_ITEM)}
          >
            {filterLabel(option)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            <Trans id="deviceClassEditor.dmxController.parameters.none">
              No parameters to show
            </Trans>
          </p>
        ) : (
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-2/5" />
              <col />
              <col className="w-16" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-card text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="py-2 pr-2 font-medium">
                  <Trans id="deviceClassEditor.dmxController.parameters.parameterColumn">
                    Parameter
                  </Trans>
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  <Trans id="deviceClassEditor.dmxController.parameters.valueColumn">
                    Value
                  </Trans>
                </th>
                <th scope="col" className="py-2 pl-2 text-center font-medium">
                  <Trans id="deviceClassEditor.dmxController.parameters.actionColumn">
                    Action
                  </Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ParameterRowView
                  key={row.key}
                  row={row}
                  paramStates={paramStates}
                  initialParamStates={initialParamStates}
                  onParamChange={onParamChange}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

function parameterRows(
  mappableParams: MappableParameter[],
  instanceLabel: (name: string, index: number) => string,
): ParameterRow[] {
  const rows: ParameterRow[] = [];

  for (const mappable of mappableParams) {
    const name = mappable.friendlyName || mappable.param.codexId;
    const count = getParameterCount(mappable.param.count);

    for (let index = 0; index < count; index++) {
      const paramIndex = count > 1 ? index : undefined;
      rows.push({
        key: serializeParamRef({
          id: mappable.param.codexId,
          index: paramIndex,
        }),
        mappable,
        index: paramIndex,
        label: count > 1 ? instanceLabel(name, index) : name,
      });
    }
  }

  return rows.sort((a, b) => a.label.localeCompare(b.label));
}

interface ParameterRowViewProps {
  row: ParameterRow;
  paramStates: ParamStates;
  initialParamStates: ParamStates;
  onParamChange: ParamChangeHandler;
}

const ParameterRowView = ({
  row,
  paramStates,
  initialParamStates,
  onParamChange,
}: ParameterRowViewProps) => {
  const { _ } = useLingui();
  const { mappable, index, label } = row;
  const paramId = mappable.param.codexId;
  const value = paramStates.get(row.key)?.value;
  const resetValue = getResetValue(mappable, initialParamStates.get(row.key));
  const unit = getUnitString(mappable.paramClass.unit);
  const description = mappable.paramClass.description?.value;

  const setValue = (newValue: DriverParamValue) =>
    onParamChange(paramId, index, newValue);

  return (
    <tr className="border-b last:border-b-0">
      <td className="py-2 pr-2">
        <div className="flex items-center gap-1.5">
          <span>
            {label}
            {unit && <span className="text-muted-foreground"> ({unit})</span>}
          </span>
          {description && (
            <Tooltip>
              <TooltipTrigger
                aria-label={description}
                className="text-muted-foreground"
              >
                <InfoIcon className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {description}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </td>
      <td className="px-2 py-2">
        <ValueControl
          mappable={mappable}
          label={label}
          value={value}
          onChange={setValue}
        />
      </td>
      <td className="py-2 pl-2 text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={_(MESSAGES.resetToDefault)}
              disabled={resetValue === undefined}
              onClick={() => resetValue && setValue(resetValue)}
            >
              <RotateCcwIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{_(MESSAGES.resetToDefault)}</TooltipContent>
        </Tooltip>
      </td>
    </tr>
  );
};

interface ValueControlProps {
  mappable: MappableParameter;
  // The accessible name of the control.
  label: string;
  value: DriverParamValue | undefined;
  onChange: (value: DriverParamValue) => void;
}

const ValueControl = ({
  mappable,
  label,
  value,
  onChange,
}: ValueControlProps) => {
  const inactive = !value || value.type === "null";

  switch (mappable.paramClass.dataType) {
    case fcDataTypes.NUMBER:
      return (
        <NumberControl
          mappable={mappable}
          label={label}
          value={getNumericValue(value)}
          onChange={(newValue) =>
            onChange({ type: "numeric", value: newValue })
          }
        />
      );

    case fcDataTypes.BOOLEAN: {
      const checked = getBooleanValue(value) ?? false;
      return (
        <label className="flex items-center gap-2">
          <Switch
            aria-label={label}
            checked={checked}
            className={cn(inactive && "opacity-50")}
            onCheckedChange={(newValue) =>
              onChange({ type: "bool", value: newValue })
            }
          />
          <span className="text-muted-foreground">
            {checked ? (
              <Trans id="deviceClassEditor.dmxController.parameters.on">
                On
              </Trans>
            ) : (
              <Trans id="deviceClassEditor.dmxController.parameters.off">
                Off
              </Trans>
            )}
          </span>
        </label>
      );
    }

    case fcDataTypes.ENUM: {
      const selected = getNumericValue(value);
      const choices = mappable.enumChoices;
      const known = choices.some((choice) => choice.index === selected);
      return (
        <Select
          value={known ? String(selected) : ""}
          disabled={choices.length === 0}
          onValueChange={(newValue) =>
            onChange({ type: "enum", value: Number(newValue) })
          }
        >
          <SelectTrigger
            size="sm"
            aria-label={label}
            className={cn("w-full", inactive && "opacity-50")}
          >
            <SelectValue
              placeholder={selected === null ? undefined : String(selected)}
            />
          </SelectTrigger>
          <SelectContent>
            {choices.map((choice) => (
              <SelectItem key={choice.index} value={String(choice.index)}>
                {choice.name.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
  }
};

interface NumberControlProps {
  mappable: MappableParameter;
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}

const NumberControl = ({
  mappable,
  label,
  value,
  onChange,
}: NumberControlProps) => {
  const { minimum, maximum } = mappable.param;
  const min = typeof minimum === "number" ? minimum : undefined;
  const max = typeof maximum === "number" ? maximum : undefined;
  const hasRange = min !== undefined && max !== undefined && min < max;
  const step = hasRange ? getSliderStepSize(min, max) : 1;

  return (
    <div className="flex items-center gap-3">
      {hasRange ? (
        <Slider
          aria-label={label}
          className={cn("min-w-16 flex-1", value === null && "opacity-50")}
          min={min}
          max={max}
          step={step}
          value={[value ?? min]}
          onValueChange={([newValue]) => onChange(newValue)}
        />
      ) : (
        // Keeps the box lined up with the boxes beside sliders.
        <div className="flex-1" />
      )}
      <NumberInput
        aria-label={label}
        className="w-24 shrink-0"
        inputClassName="h-8"
        nullable
        hideControls
        value={value}
        min={min}
        max={max}
        step={step}
        onCommit={(newValue) => newValue !== null && onChange(newValue)}
      />
    </div>
  );
};
