import { useState } from "react";
import {
  ExclamationTriangleIcon,
  PencilIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { TrashIcon } from "@heroicons/react/24/solid";
import {
  CodexId,
  DmxMapping,
  DmxMappingRange,
  DmxUnmappedParam,
  fcDataTypes,
  ParameterReference,
} from "app/persistentState";
import { StringSelector } from "components/StringSelector";
import { TextEditorField } from "components/EditorFields/DeprecatedTextEditorField";
import { SelectField } from "components/EditorFields/DeprecatedSelectField";
import { Table } from "components/Table";
import { SmallIconButton } from "components/SmallIconButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/scn-ui/Select";
import {
  parseParameterReference,
  serializeParameterReference,
} from "utils/utils";
import { MappingRangeEditorDialog } from "./MappingRangeEditorDialog";
import { MappingRangeText } from "./MappingRangeText";
import {
  EffectiveEnumChoice,
  getEffectiveEnd,
  normalizeEndValue,
} from "./mappingUtils";
import {
  MappableDataType,
  MappableParameter,
  useMappableParameters,
} from "./state";

interface DmxParameterMappingProps {
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
  onRemove: () => void;
}

/**
 * Generates expanded parameter reference candidates.
 * For parameters with count > 1, creates multiple entries (one per index).
 * Returns both the serialized string (for display) and the ParameterReference.
 */
function generateParameterCandidates(
  mappableParams: Record<CodexId, MappableParameter>,
): { ref: ParameterReference; str: string; mappable: MappableParameter }[] {
  const candidates: {
    ref: ParameterReference;
    str: string;
    mappable: MappableParameter;
  }[] = [];

  for (const [codexId, mappable] of Object.entries(mappableParams)) {
    const count = mappable.param.count;
    const countValue = count?.type === "fixed" ? count.value : undefined;
    if (countValue !== undefined && countValue > 1) {
      for (let i = 0; i < countValue; i++) {
        const ref: ParameterReference = { codexId: CodexId(codexId), index: i };
        candidates.push({
          ref,
          str: serializeParameterReference(ref),
          mappable,
        });
      }
    } else {
      const ref: ParameterReference = { codexId: CodexId(codexId) };
      candidates.push({
        ref,
        str: serializeParameterReference(ref),
        mappable,
      });
    }
  }

  return candidates;
}

export const DmxParameterMapping = ({
  mapping,
  onUpdate,
  onRemove,
}: DmxParameterMappingProps) => {
  const [editingRangeIndex, setEditingRangeIndex] = useState<number | null>(
    null,
  );
  const [isAddingRange, setIsAddingRange] = useState(false);

  const mappableParams = useMappableParameters();
  const allCandidates = generateParameterCandidates(mappableParams);

  const mappedParamStr = serializeParameterReference(mapping.mappedParam);
  const mappedParameterCandidateStrs = allCandidates.map((c) => c.str);
  const mappedParamMappable = mappableParams[mapping.mappedParam.codexId];

  // The mapping is valid if the mapped parameter exists and is in the candidates list
  const isValidMapping =
    mappedParamMappable !== undefined &&
    mappedParameterCandidateStrs.includes(mappedParamStr);

  // Filter out already-used parameters for unmapped candidates
  const unmappedParameterCandidates = allCandidates.filter((candidate) => {
    if (candidate.str === mappedParamStr) return false;
    if (
      mapping.unmappedParams?.some(
        (up) => serializeParameterReference(up.parameter) === candidate.str,
      )
    ) {
      return false;
    }
    return true;
  });

  // Header with parameter selector - always shown so user can fix invalid mappings
  const header = (
    <div className="flex items-center">
      <div className="mx-1">Parameter:</div>
      <StringSelector
        className="!min-w-48 overflow-y-auto"
        items={mappedParameterCandidateStrs}
        selectedItem={mappedParamStr}
        onSelectedItemChanged={(newVal) =>
          onUpdate({
            mappedParam: parseParameterReference(newVal),
            ranges: [],
          })
        }
      />
      <div className="grow" />
      <SmallIconButton onClick={onRemove}>
        <TrashIcon />
      </SmallIconButton>
    </div>
  );

  // Invalid mapping: show error state with disabled controls
  if (!isValidMapping) {
    return (
      <div className="bg-slate-300 border border-gray-400 dark:border-hidden dark:bg-gray-600 m-2 p-2 rounded flex flex-col">
        {header}
        <span className="font-bold mt-2 p-1">Mapping Ranges</span>
        <div>Parameter mapping has bad data</div>
        <span className="font-bold mt-2 p-1">Unmapped Parameters</span>
        <Tooltip>
          <TooltipTrigger asChild className="self-start">
            <SmallIconButton className="size-7" disabled>
              <PlusCircleIcon className="size-5" />
            </SmallIconButton>
          </TooltipTrigger>
          <TooltipContent>Add Unmapped Parameter</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Valid mapping: extract data with proper types
  const { paramClass, enumChoices } = mappedParamMappable;
  const dataType = paramClass.dataType;

  const editingRange =
    editingRangeIndex !== null ? mapping.ranges[editingRangeIndex] : null;

  const addRangeButton = (
    <Tooltip>
      <TooltipTrigger asChild className="self-start">
        <SmallIconButton
          className="size-7"
          onClick={() => setIsAddingRange(true)}
        >
          <PlusCircleIcon className="size-5" />
        </SmallIconButton>
      </TooltipTrigger>
      <TooltipContent>Add Range</TooltipContent>
    </Tooltip>
  );

  const ranges = (
    <div className="flex flex-col gap-1">
      {mapping.ranges.map((range, index) => (
        <RangeCard
          key={index}
          range={range}
          onEdit={() => setEditingRangeIndex(index)}
          onDelete={() => {
            onUpdate({
              ...mapping,
              ranges: [
                ...mapping.ranges.slice(0, index),
                ...mapping.ranges.slice(index + 1),
              ],
            });
          }}
          enumChoices={dataType === "enum" ? enumChoices : undefined}
        />
      ))}
      {addRangeButton}
    </div>
  );

  const addUnmappedParamButton = (
    <Tooltip>
      <TooltipTrigger asChild className="self-start">
        <SmallIconButton
          className="size-7"
          disabled={unmappedParameterCandidates.length === 0}
          onClick={() => {
            const firstCandidate = unmappedParameterCandidates[0];
            const newParam = getNewUnmappedParam(
              firstCandidate.ref,
              firstCandidate.mappable.paramClass.dataType,
              firstCandidate.mappable.enumChoices,
            );
            onUpdate({
              ...mapping,
              unmappedParams: mapping.unmappedParams
                ? [...mapping.unmappedParams, newParam]
                : [newParam],
            });
          }}
        >
          <PlusCircleIcon className="size-5" />
        </SmallIconButton>
      </TooltipTrigger>
      <TooltipContent>Add Unmapped Parameter</TooltipContent>
    </Tooltip>
  );

  const unmappedParams =
    mapping.unmappedParams && mapping.unmappedParams.length > 0 ? (
      <>
        <Table>
          <thead>
            <tr>
              <td>Parameter</td>
              <td>Start</td>
              <td>End</td>
            </tr>
          </thead>
          <tbody>
            {mapping.unmappedParams.map((param, index) => (
              <UnmappedParameterTableRow
                key={index}
                index={index}
                param={param}
                mappableParams={mappableParams}
                eligibleCandidates={unmappedParameterCandidates}
                mapping={mapping}
                onUpdate={onUpdate}
              />
            ))}
          </tbody>
        </Table>
        {addUnmappedParamButton}
      </>
    ) : (
      addUnmappedParamButton
    );

  return (
    <div className="bg-slate-300 border border-gray-400 dark:border-hidden dark:bg-gray-600 m-2 p-2 rounded flex flex-col">
      {header}
      <span className="font-bold mt-2 p-1">Mapping Ranges</span>
      {ranges}
      <span className="font-bold mt-2 p-1">Unmapped Parameters</span>
      {unmappedParams}

      {editingRange && (
        <MappingRangeEditorDialog
          isOpen={editingRangeIndex !== null}
          onClose={() => setEditingRangeIndex(null)}
          range={editingRange}
          onSave={(newRange) => {
            onUpdate({
              ...mapping,
              ranges: mapping.ranges.map((r, i) =>
                i === editingRangeIndex ? newRange : r,
              ),
            });
            setEditingRangeIndex(null);
          }}
          dataType={dataType}
          enumChoices={enumChoices}
        />
      )}

      {isAddingRange && (
        <MappingRangeEditorDialog
          isOpen={isAddingRange}
          onClose={() => setIsAddingRange(false)}
          range={getNewRange(dataType, enumChoices)}
          onSave={(newRange) => {
            onUpdate({
              ...mapping,
              ranges: [...mapping.ranges, newRange],
            });
            setIsAddingRange(false);
          }}
          dataType={dataType}
          enumChoices={enumChoices}
        />
      )}
    </div>
  );
};

interface RangeCardProps {
  range: DmxMappingRange;
  onEdit: () => void;
  onDelete: () => void;
  enumChoices?: EffectiveEnumChoice[];
}

const RangeCard = ({
  range,
  onEdit,
  onDelete,
  enumChoices,
}: RangeCardProps) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
      <MappingRangeText range={range} enumChoices={enumChoices} />
      <Tooltip>
        <TooltipTrigger asChild>
          <SmallIconButton onClick={onEdit}>
            <PencilIcon className="size-4" />
          </SmallIconButton>
        </TooltipTrigger>
        <TooltipContent>Edit</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <SmallIconButton onClick={onDelete}>
            <TrashIcon className="size-4" />
          </SmallIconButton>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
    </div>
  );
};

function getNewRange(
  dataType: MappableDataType,
  enumChoices: EffectiveEnumChoice[],
): DmxMappingRange {
  switch (dataType) {
    case "boolean":
      return {
        start: false,
        end: true,
        chunkValues: {
          type: "range",
          chunkStart: 0,
          chunkEnd: 255,
        },
      };
    case "enum": {
      const lastIndex = enumChoices.length > 0 ? enumChoices.length - 1 : 0;
      return {
        start: 0,
        end: lastIndex,
        chunkValues: {
          type: "range",
          chunkStart: 0,
          chunkEnd: 255,
        },
      };
    }
    case "number":
    default:
      return {
        start: 0,
        end: 1,
        chunkValues: {
          type: "range",
          chunkStart: 0,
          chunkEnd: 255,
        },
      };
  }
}

type ParameterCandidate = {
  ref: ParameterReference;
  str: string;
  mappable: MappableParameter;
};

const InvalidUnmappedParamTableRow = () => (
  <tr>
    <td colSpan={3}>Invalid data in unmapped parameter</td>
  </tr>
);

interface UnmappedParameterTableRowProps {
  index: number;
  param: DmxUnmappedParam;
  mappableParams: Record<CodexId, MappableParameter>;
  eligibleCandidates: ParameterCandidate[];
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
}

const UnmappedParameterTableRow = ({
  index,
  param,
  mappableParams,
  eligibleCandidates,
  mapping,
  onUpdate,
}: UnmappedParameterTableRowProps) => {
  const mappable = mappableParams[param.parameter.codexId];
  if (!mappable) {
    return <InvalidUnmappedParamTableRow />;
  }

  switch (mappable.paramClass.dataType) {
    case fcDataTypes.NUMBER:
      return (
        <UnmappedParameterTableRowNumeric
          index={index}
          param={param}
          mappableParams={mappableParams}
          eligibleCandidates={eligibleCandidates}
          mapping={mapping}
          onUpdate={onUpdate}
        />
      );
    case fcDataTypes.BOOLEAN:
      return (
        <UnmappedParameterTableRowBoolean
          index={index}
          param={param}
          mappableParams={mappableParams}
          eligibleCandidates={eligibleCandidates}
          mapping={mapping}
          onUpdate={onUpdate}
        />
      );
    case fcDataTypes.ENUM:
      return (
        <UnmappedParameterTableRowEnum
          index={index}
          param={param}
          mappableParams={mappableParams}
          eligibleCandidates={eligibleCandidates}
          mapping={mapping}
          onUpdate={onUpdate}
        />
      );
    default:
      return <InvalidUnmappedParamTableRow />;
  }
};

interface UnmappedParameterTableRowBooleanProps {
  index: number;
  param: DmxUnmappedParam;
  mappableParams: Record<CodexId, MappableParameter>;
  eligibleCandidates: ParameterCandidate[];
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
}

const UnmappedParameterTableRowBoolean = ({
  index,
  param,
  mappableParams,
  eligibleCandidates,
  mapping,
  onUpdate,
}: UnmappedParameterTableRowBooleanProps) => {
  const selectValues = ["false", "true"];

  const paramStr = serializeParameterReference(param.parameter);
  const allEligibleStrs = [...eligibleCandidates.map((c) => c.str), paramStr];

  const effectiveEnd = getEffectiveEnd(param.start, param.end);

  const handleEndChange = (newValue: string) => {
    const parsed = newValue === "true";
    const normalized = normalizeEndValue(param.start, parsed);
    onUpdate(updateUnmappedParamEnd(mapping, index, normalized));
  };

  return (
    <tr key={index}>
      <td>
        <StringSelector
          items={allEligibleStrs}
          selectedItem={paramStr}
          onSelectedItemChanged={(newValue) => {
            const newRef = parseParameterReference(newValue);
            const newMappable = mappableParams[newRef.codexId];
            onUpdate({
              ...mapping,
              unmappedParams: [
                ...mapping.unmappedParams!.slice(0, index),
                getNewUnmappedParam(
                  newRef,
                  newMappable.paramClass.dataType,
                  newMappable.enumChoices,
                ),
                ...mapping.unmappedParams!.slice(index + 1),
              ],
            });
          }}
        />
      </td>
      <td className="!align-middle">
        <SelectField
          values={selectValues}
          selectedValue={(param.start as boolean).toString()}
          onSelectionChanged={(newValue) => {
            onUpdate(
              updateUnmappedParamStart(mapping, index, newValue === "true"),
            );
          }}
        />
      </td>
      <td className="!align-middle">
        <SelectField
          values={selectValues}
          selectedValue={(effectiveEnd as boolean).toString()}
          onSelectionChanged={handleEndChange}
        />
      </td>
      <td className="!align-middle">
        <SmallIconButton
          onClick={() => {
            onUpdate({
              ...mapping,
              unmappedParams:
                mapping.unmappedParams!.length === 1
                  ? undefined
                  : [
                      ...mapping.unmappedParams!.slice(0, index),
                      ...mapping.unmappedParams!.slice(index + 1),
                    ],
            });
          }}
        >
          <TrashIcon />
        </SmallIconButton>
      </td>
    </tr>
  );
};

interface UnmappedParameterTableRowNumericProps {
  index: number;
  param: DmxUnmappedParam;
  mappableParams: Record<CodexId, MappableParameter>;
  eligibleCandidates: ParameterCandidate[];
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
}

const UnmappedParameterTableRowNumeric = ({
  index,
  param,
  mappableParams,
  eligibleCandidates,
  mapping,
  onUpdate,
}: UnmappedParameterTableRowNumericProps) => {
  const paramStr = serializeParameterReference(param.parameter);
  const allEligibleStrs = [...eligibleCandidates.map((c) => c.str), paramStr];

  const effectiveEnd = getEffectiveEnd(param.start, param.end);

  const handleEndChange = (newValue: string) => {
    const parsed = parseInt(newValue);
    const normalized = normalizeEndValue(param.start, parsed);
    onUpdate(updateUnmappedParamEnd(mapping, index, normalized));
  };

  return (
    <tr key={index}>
      <td>
        <StringSelector
          items={allEligibleStrs}
          selectedItem={paramStr}
          onSelectedItemChanged={(newValue) => {
            const newRef = parseParameterReference(newValue);
            const newMappable = mappableParams[newRef.codexId];
            onUpdate({
              ...mapping,
              unmappedParams: [
                ...mapping.unmappedParams!.slice(0, index),
                getNewUnmappedParam(
                  newRef,
                  newMappable.paramClass.dataType,
                  newMappable.enumChoices,
                ),
                ...mapping.unmappedParams!.slice(index + 1),
              ],
            });
          }}
        />
      </td>
      <td className="!align-middle">
        <TextEditorField
          value={param.start?.toString()}
          onValueChanged={(newValue) => {
            onUpdate(
              updateUnmappedParamStart(mapping, index, parseInt(newValue)),
            );
          }}
        />
      </td>
      <td className="!align-middle">
        <TextEditorField
          value={effectiveEnd?.toString()}
          onValueChanged={handleEndChange}
        />
      </td>
      <td className="!align-middle">
        <SmallIconButton
          onClick={() => {
            onUpdate({
              ...mapping,
              unmappedParams:
                mapping.unmappedParams!.length === 1
                  ? undefined
                  : [
                      ...mapping.unmappedParams!.slice(0, index),
                      ...mapping.unmappedParams!.slice(index + 1),
                    ],
            });
          }}
        >
          <TrashIcon />
        </SmallIconButton>
      </td>
    </tr>
  );
};

interface UnmappedParameterTableRowEnumProps {
  index: number;
  param: DmxUnmappedParam;
  mappableParams: Record<CodexId, MappableParameter>;
  eligibleCandidates: ParameterCandidate[];
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
}

const UnmappedParameterTableRowEnum = ({
  index,
  param,
  mappableParams,
  eligibleCandidates,
  mapping,
  onUpdate,
}: UnmappedParameterTableRowEnumProps) => {
  const mappable = mappableParams[param.parameter.codexId];
  const paramStr = serializeParameterReference(param.parameter);
  const allEligibleStrs = [...eligibleCandidates.map((c) => c.str), paramStr];
  const enumChoices = mappable?.enumChoices ?? [];
  const effectiveEnd = getEffectiveEnd(param.start, param.end);

  // Check if a bound value is valid (matches an available choice)
  const isValidIndex = (val: number | boolean | undefined): boolean => {
    if (val === undefined) return true;
    if (typeof val !== "number" || !Number.isInteger(val)) return false;
    return enumChoices.some((c) => c.index === val);
  };

  const startIsValid = isValidIndex(param.start);
  const endIsValid = isValidIndex(effectiveEnd);

  // Convert bound value to select value string
  const boundToSelectValue = (val: number | boolean | undefined): string => {
    if (val === undefined) return "null";
    if (typeof val === "number" && Number.isInteger(val)) {
      return val.toString();
    }
    return `invalid:${val}`;
  };

  const startValue = boundToSelectValue(param.start);
  const endValue = boundToSelectValue(effectiveEnd);

  // Format choice label: "Name (index)"
  const formatChoice = (choice: EffectiveEnumChoice): string => {
    return `${choice.name.value} (${choice.index})`;
  };

  const parseEnumValue = (val: string): number | undefined => {
    if (val === "null") return undefined;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? undefined : parsed;
  };

  const handleEndChange = (val: string) => {
    const parsed = parseEnumValue(val);
    const normalized = normalizeEndValue(param.start, parsed);
    onUpdate(updateUnmappedParamEnd(mapping, index, normalized));
  };

  const invalidBorderClass = "border-orange-500 dark:border-orange-400";

  const hasNoChoices = enumChoices.length === 0;

  return (
    <tr key={index}>
      <td>
        <div className="flex items-center gap-2">
          <StringSelector
            items={allEligibleStrs}
            selectedItem={paramStr}
            onSelectedItemChanged={(newValue) => {
              const newRef = parseParameterReference(newValue);
              const newMappable = mappableParams[newRef.codexId];
              onUpdate({
                ...mapping,
                unmappedParams: [
                  ...mapping.unmappedParams!.slice(0, index),
                  getNewUnmappedParam(
                    newRef,
                    newMappable.paramClass.dataType,
                    newMappable.enumChoices,
                  ),
                  ...mapping.unmappedParams!.slice(index + 1),
                ],
              });
            }}
          />
          {hasNoChoices && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ExclamationTriangleIcon className="size-5 text-orange-500 shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                No enum choices are defined for this parameter. The parameter
                class or instance must define choices for enum values to be
                selectable.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </td>
      <td className="!align-middle">
        <Select
          value={startIsValid ? startValue : ""}
          onValueChange={(v) =>
            onUpdate(
              updateUnmappedParamStart(mapping, index, parseEnumValue(v)),
            )
          }
        >
          <SelectTrigger
            className={`w-40 ${!startIsValid ? invalidBorderClass : ""}`}
          >
            <SelectValue
              placeholder={
                !startIsValid ? `Invalid: ${param.start}` : undefined
              }
            />
          </SelectTrigger>
          <SelectContent>
            {enumChoices.map((choice) => (
              <SelectItem key={choice.index} value={choice.index.toString()}>
                {formatChoice(choice)}
              </SelectItem>
            ))}
            <SelectItem value="null">null</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="!align-middle">
        <Select
          value={endIsValid ? endValue : ""}
          onValueChange={handleEndChange}
        >
          <SelectTrigger
            className={`w-40 ${!endIsValid ? invalidBorderClass : ""}`}
          >
            <SelectValue
              placeholder={!endIsValid ? `Invalid: ${effectiveEnd}` : undefined}
            />
          </SelectTrigger>
          <SelectContent>
            {enumChoices.map((choice) => (
              <SelectItem key={choice.index} value={choice.index.toString()}>
                {formatChoice(choice)}
              </SelectItem>
            ))}
            <SelectItem value="null">null</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="!align-middle">
        <SmallIconButton
          onClick={() => {
            onUpdate({
              ...mapping,
              unmappedParams:
                mapping.unmappedParams!.length === 1
                  ? undefined
                  : [
                      ...mapping.unmappedParams!.slice(0, index),
                      ...mapping.unmappedParams!.slice(index + 1),
                    ],
            });
          }}
        >
          <TrashIcon />
        </SmallIconButton>
      </td>
    </tr>
  );
};

function getNewUnmappedParam(
  param: ParameterReference,
  dataType: string,
  enumChoices: EffectiveEnumChoice[],
): DmxUnmappedParam {
  switch (dataType) {
    case fcDataTypes.BOOLEAN:
      return {
        parameter: param,
        start: false,
        end: true,
      };
    case fcDataTypes.ENUM: {
      const lastIndex = enumChoices.length > 0 ? enumChoices.length - 1 : 0;
      return {
        parameter: param,
        start: 0,
        end: lastIndex,
      };
    }
    case fcDataTypes.NUMBER:
    default:
      return {
        parameter: param,
        start: 0,
        end: 1,
      };
  }
}

function updateUnmappedParamStart(
  mapping: DmxMapping,
  paramIndex: number,
  newStart: number | boolean | undefined,
): DmxMapping {
  const newParam = {
    ...mapping.unmappedParams![paramIndex],
    start: newStart,
  };
  return {
    ...mapping,
    unmappedParams: [
      ...mapping.unmappedParams!.slice(0, paramIndex),
      newParam,
      ...mapping.unmappedParams!.slice(paramIndex + 1),
    ],
  };
}

function updateUnmappedParamEnd(
  mapping: DmxMapping,
  paramIndex: number,
  newEnd: number | boolean | undefined,
): DmxMapping {
  const newParam = {
    ...mapping.unmappedParams![paramIndex],
    end: newEnd,
  };
  return {
    ...mapping,
    unmappedParams: [
      ...mapping.unmappedParams!.slice(0, paramIndex),
      newParam,
      ...mapping.unmappedParams!.slice(paramIndex + 1),
    ],
  };
}
