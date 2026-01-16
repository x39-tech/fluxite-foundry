import { useState } from "react";
import { PencilIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
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
import { ResolvedParameter, useParametersWithClasses } from "../state";
import {
  parseParameterReference,
  serializeParameterReference,
} from "utils/utils";
import { MappingRangeEditorDialog } from "./MappingRangeEditorDialog";
import { MappingRangeText } from "./MappingRangeText";

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
  paramsWithClasses: Record<CodexId, ResolvedParameter>,
): { ref: ParameterReference; str: string; resolved: ResolvedParameter }[] {
  const candidates: {
    ref: ParameterReference;
    str: string;
    resolved: ResolvedParameter;
  }[] = [];

  for (const [codexId, resolved] of Object.entries(paramsWithClasses)) {
    const count = resolved.param.count;
    const countValue = count?.type === "fixed" ? count.value : undefined;
    if (countValue !== undefined && countValue > 1) {
      for (let i = 0; i < countValue; i++) {
        const ref: ParameterReference = { codexId: CodexId(codexId), index: i };
        candidates.push({
          ref,
          str: serializeParameterReference(ref),
          resolved,
        });
      }
    } else {
      const ref: ParameterReference = { codexId: CodexId(codexId) };
      candidates.push({
        ref,
        str: serializeParameterReference(ref),
        resolved,
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

  // Filter to only number/boolean parameters
  const paramsWithClasses = Object.fromEntries(
    Object.entries(useParametersWithClasses()).filter(([_, resolved]) => {
      return (
        resolved.paramClass.dataType == fcDataTypes.NUMBER ||
        resolved.paramClass.dataType == fcDataTypes.BOOLEAN
      );
    }),
  );

  // Generate expanded candidates for all parameters
  const allCandidates = generateParameterCandidates(paramsWithClasses);

  const mappedParamStr = serializeParameterReference(mapping.mappedParam);
  const mappedParameterCandidateStrs = allCandidates.map((c) => c.str);
  const mappedParamResolved = paramsWithClasses[mapping.mappedParam.codexId];

  // Filter out already-used parameters for unmapped candidates
  const unmappedParameterCandidates = allCandidates.filter((candidate) => {
    // Exclude the mapped parameter
    if (candidate.str === mappedParamStr) {
      return false;
    }
    // Exclude already selected unmapped parameters
    if (
      mapping.unmappedParams?.some(
        (up) => serializeParameterReference(up.parameter) === candidate.str,
      )
    ) {
      return false;
    }
    return true;
  });

  let ranges = (
    <>
      <div>Parameter mapping has bad data</div>
    </>
  );
  let isOk = false;
  let isBoolean = false;

  if (
    mappedParameterCandidateStrs.includes(mappedParamStr) &&
    mappedParamResolved
  ) {
    try {
      switch (mappedParamResolved.paramClass.dataType) {
        case fcDataTypes.NUMBER:
          break;
        case fcDataTypes.BOOLEAN:
          isBoolean = true;
          break;
        default:
          throw new Error();
      }

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

      ranges = (
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
            />
          ))}
          {addRangeButton}
        </div>
      );
      isOk = true;
    } catch (_) {
      // Do nothing - error message will be displayed
    }
  }

  let unmappedParams = (
    <Tooltip>
      <TooltipTrigger asChild className="self-start">
        <SmallIconButton
          className="size-7"
          disabled={!isOk || unmappedParameterCandidates.length === 0}
          onClick={() => {
            const firstCandidate = unmappedParameterCandidates[0];
            const newParam = getNewUnmappedParam(
              firstCandidate.ref,
              firstCandidate.resolved.paramClass.dataType ==
                fcDataTypes.BOOLEAN,
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

  if (mapping.unmappedParams && mapping.unmappedParams.length > 0) {
    unmappedParams = (
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
                paramsWithClasses={paramsWithClasses}
                eligibleCandidates={unmappedParameterCandidates}
                mapping={mapping}
                onUpdate={onUpdate}
              />
            ))}
          </tbody>
        </Table>
        {unmappedParams}
      </>
    );
  }

  const editingRange =
    editingRangeIndex !== null ? mapping.ranges[editingRangeIndex] : null;

  return (
    <div className="bg-slate-300 border border-gray-400 dark:border-hidden dark:bg-gray-600 m-2 p-2 rounded flex flex-col">
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
          isBoolean={isBoolean}
        />
      )}

      {isAddingRange && (
        <MappingRangeEditorDialog
          isOpen={isAddingRange}
          onClose={() => setIsAddingRange(false)}
          range={getNewRange(isBoolean)}
          onSave={(newRange) => {
            onUpdate({
              ...mapping,
              ranges: [...mapping.ranges, newRange],
            });
            setIsAddingRange(false);
          }}
          isBoolean={isBoolean}
        />
      )}
    </div>
  );
};

interface RangeCardProps {
  range: DmxMappingRange;
  onEdit: () => void;
  onDelete: () => void;
}

const RangeCard = ({ range, onEdit, onDelete }: RangeCardProps) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
      <MappingRangeText range={range} />
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

function getNewRange(isBoolean: boolean): DmxMappingRange {
  if (isBoolean) {
    return {
      start: false,
      end: true,
      chunkValues: {
        type: "range",
        chunkStart: 0,
        chunkEnd: 255,
      },
    };
  } else {
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
  resolved: ResolvedParameter;
};

const InvalidUnmappedParamTableRow = () => (
  <tr>
    <td colSpan={3}>Invalid data in unmapped parameter</td>
  </tr>
);

interface UnmappedParameterTableRowProps {
  index: number;
  param: DmxUnmappedParam;
  paramsWithClasses: Record<CodexId, ResolvedParameter>;
  eligibleCandidates: ParameterCandidate[];
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
}

const UnmappedParameterTableRow = ({
  index,
  param,
  paramsWithClasses,
  eligibleCandidates,
  mapping,
  onUpdate,
}: UnmappedParameterTableRowProps) => {
  const resolved = paramsWithClasses[param.parameter.codexId];
  if (!resolved) {
    return <InvalidUnmappedParamTableRow />;
  }

  switch (resolved.paramClass.dataType) {
    case fcDataTypes.NUMBER:
      return (
        <UnmappedParameterTableRowNumeric
          index={index}
          param={param}
          paramsWithClasses={paramsWithClasses}
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
          paramsWithClasses={paramsWithClasses}
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
  paramsWithClasses: Record<CodexId, ResolvedParameter>;
  eligibleCandidates: ParameterCandidate[];
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
}

const UnmappedParameterTableRowBoolean = ({
  index,
  param,
  paramsWithClasses,
  eligibleCandidates,
  mapping,
  onUpdate,
}: UnmappedParameterTableRowBooleanProps) => {
  const selectValues = ["false", "true"];

  const paramStr = serializeParameterReference(param.parameter);
  const allEligibleStrs = [...eligibleCandidates.map((c) => c.str), paramStr];

  return (
    <tr key={index}>
      <td>
        <StringSelector
          items={allEligibleStrs}
          selectedItem={paramStr}
          onSelectedItemChanged={(newValue) => {
            const newRef = parseParameterReference(newValue);
            const newResolved = paramsWithClasses[newRef.codexId];
            onUpdate({
              ...mapping,
              unmappedParams: [
                ...mapping.unmappedParams!.slice(0, index),
                getNewUnmappedParam(
                  newRef,
                  newResolved.paramClass.dataType == fcDataTypes.BOOLEAN,
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
          selectedValue={(param.end as boolean).toString()}
          onSelectionChanged={(newValue) => {
            onUpdate(
              updateUnmappedParamEnd(mapping, index, newValue === "true"),
            );
          }}
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
  paramsWithClasses: Record<CodexId, ResolvedParameter>;
  eligibleCandidates: ParameterCandidate[];
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
}

const UnmappedParameterTableRowNumeric = ({
  index,
  param,
  paramsWithClasses,
  eligibleCandidates,
  mapping,
  onUpdate,
}: UnmappedParameterTableRowNumericProps) => {
  const paramStr = serializeParameterReference(param.parameter);
  const allEligibleStrs = [...eligibleCandidates.map((c) => c.str), paramStr];

  return (
    <tr key={index}>
      <td>
        <StringSelector
          items={allEligibleStrs}
          selectedItem={paramStr}
          onSelectedItemChanged={(newValue) => {
            const newRef = parseParameterReference(newValue);
            const newResolved = paramsWithClasses[newRef.codexId];
            onUpdate({
              ...mapping,
              unmappedParams: [
                ...mapping.unmappedParams!.slice(0, index),
                getNewUnmappedParam(
                  newRef,
                  newResolved.paramClass.dataType == fcDataTypes.BOOLEAN,
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
          value={param.end?.toString()}
          onValueChanged={(newValue) => {
            onUpdate(
              updateUnmappedParamEnd(mapping, index, parseInt(newValue)),
            );
          }}
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

function getNewUnmappedParam(
  param: ParameterReference,
  isBoolean: boolean,
): DmxUnmappedParam {
  if (isBoolean) {
    return {
      parameter: param,
      start: false,
      end: true,
    };
  } else {
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
