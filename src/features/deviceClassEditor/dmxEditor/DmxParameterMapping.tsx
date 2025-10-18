import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { TrashIcon } from "@heroicons/react/24/solid";
import { DataType } from "e173";
import {
  CodexId,
  DmxMapping,
  DmxMappingRange,
  DmxUnmappedParam,
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
    if (count !== undefined && count > 1) {
      for (let i = 0; i < count; i++) {
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
  // Filter to only number/boolean parameters
  const paramsWithClasses = Object.fromEntries(
    Object.entries(useParametersWithClasses()).filter(([_, resolved]) => {
      return (
        resolved.paramClass.dataType == DataType.Number ||
        resolved.paramClass.dataType == DataType.Boolean
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
        case DataType.Number:
          break;
        case DataType.Boolean:
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
              onClick={() => {
                onUpdate({
                  ...mapping,
                  ranges: [...mapping.ranges, getNewRange(isBoolean)],
                });
              }}
            >
              <PlusCircleIcon className="size-5" />
            </SmallIconButton>
          </TooltipTrigger>
          <TooltipContent>Add Range</TooltipContent>
        </Tooltip>
      );

      ranges =
        mapping.ranges.length === 0 ? (
          addRangeButton
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <td>Start</td>
                  <td>End</td>
                  <td>DMX Start</td>
                  <td>DMX End</td>
                </tr>
              </thead>
              <tbody>
                {mapping.ranges.map((range, index) => (
                  <RangeTableRow
                    key={index}
                    index={index}
                    range={range}
                    mapping={mapping}
                    onUpdate={onUpdate}
                    isBoolean={isBoolean}
                  />
                ))}
              </tbody>
            </Table>
            {addRangeButton}
          </>
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
              firstCandidate.resolved.paramClass.dataType == DataType.Boolean,
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
    </div>
  );
};

interface RangeTableRowProps {
  index: number;
  range: DmxMappingRange;
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
  isBoolean: boolean;
}

const RangeTableRow = ({
  index,
  range,
  mapping,
  onUpdate,
  isBoolean,
}: RangeTableRowProps) => {
  if (isBoolean) {
    return (
      <RangeTableRowBoolean
        index={index}
        range={range}
        mapping={mapping}
        onUpdate={onUpdate}
      />
    );
  } else {
    return (
      <RangeTableRowNumeric
        index={index}
        range={range}
        mapping={mapping}
        onUpdate={onUpdate}
      />
    );
  }
};

interface RangeTableRowNumericProps {
  index: number;
  range: DmxMappingRange;
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
}

const RangeTableRowNumeric = ({
  index,
  range,
  mapping,
  onUpdate,
}: RangeTableRowNumericProps) => {
  const start = range.start;
  const end =
    range.start === undefined ? range.start : range.end || range.start;
  if (
    (typeof start !== "number" && typeof start !== "undefined") ||
    (typeof end !== "number" && typeof end !== "undefined")
  ) {
    throw new Error();
  }

  return (
    <tr key={index}>
      <td className="!align-middle">
        <TextEditorField
          value={(start === undefined ? "" : start).toString()}
          placeholder="<null>"
          onValueChanged={(newValue) => {
            onUpdate(
              updateRangeStart(
                mapping,
                index,
                newValue ? parseInt(newValue) : undefined,
              ),
            );
          }}
        />
      </td>
      <td className="!align-middle">
        <TextEditorField
          value={(end === undefined ? "" : end).toString()}
          placeholder="<null>"
          onValueChanged={(newValue) => {
            onUpdate(
              updateRangeEnd(
                mapping,
                index,
                newValue ? parseInt(newValue) : undefined,
              ),
            );
          }}
        />
      </td>
      <td className="!align-middle">
        <TextEditorField
          value={range.chunkStart.toString()}
          onValueChanged={(newValue) => {
            onUpdate(updateRangeDMXStart(mapping, index, parseInt(newValue)));
          }}
        />
      </td>
      <td className="!align-middle">
        <TextEditorField
          value={range.chunkEnd.toString()}
          onValueChanged={(newValue) => {
            onUpdate(updateRangeDMXEnd(mapping, index, parseInt(newValue)));
          }}
        />
      </td>
      <td>
        <SmallIconButton
          onClick={() => {
            onUpdate({
              ...mapping,
              ranges: [
                ...mapping.ranges.slice(0, index),
                ...mapping.ranges.slice(index + 1),
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

interface RangeTableRowBooleanProps {
  index: number;
  range: DmxMappingRange;
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
}

const RangeTableRowBoolean = ({
  index,
  range,
  mapping,
  onUpdate,
}: RangeTableRowBooleanProps) => {
  const selectValues = ["false", "true", "null"];

  const start = range.start;
  const end =
    range.start === undefined ? range.start : range.end || range.start;
  if (
    (typeof start !== "boolean" && typeof start !== "undefined") ||
    (typeof end !== "boolean" && typeof end !== "undefined")
  ) {
    throw new Error();
  }

  return (
    <tr key={index}>
      <td className="!align-middle">
        <SelectField
          values={selectValues}
          selectedValue={(start === undefined ? "null" : start).toString()}
          onSelectionChanged={(newValue) => {
            onUpdate(
              updateRangeStart(
                mapping,
                index,
                newValue === "null" ? undefined : newValue === "true",
              ),
            );
          }}
        />
      </td>
      <td className="!align-middle">
        <SelectField
          values={selectValues}
          selectedValue={(end === undefined ? "null" : end).toString()}
          onSelectionChanged={(newValue) => {
            onUpdate(
              updateRangeEnd(
                mapping,
                index,
                newValue === "null" ? undefined : newValue === "true",
              ),
            );
          }}
        />
      </td>
      <td className="!align-middle">
        <TextEditorField
          value={range.chunkStart.toString()}
          onValueChanged={(newValue) => {
            onUpdate(updateRangeDMXStart(mapping, index, parseInt(newValue)));
          }}
        />
      </td>
      <td className="!align-middle">
        <TextEditorField
          value={range.chunkEnd.toString()}
          onValueChanged={(newValue) => {
            onUpdate(updateRangeDMXEnd(mapping, index, parseInt(newValue)));
          }}
        />
      </td>
      <td>
        <SmallIconButton
          onClick={() => {
            onUpdate({
              ...mapping,
              ranges: [
                ...mapping.ranges.slice(0, index),
                ...mapping.ranges.slice(index + 1),
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

function getNewRange(isBoolean: boolean): DmxMappingRange {
  if (isBoolean) {
    return {
      start: false,
      end: true,
      chunkStart: 0,
      chunkEnd: 255,
    };
  } else {
    return {
      start: 0,
      end: 1,
      chunkStart: 0,
      chunkEnd: 255,
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
    case DataType.Number:
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
    case DataType.Boolean:
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
                  newResolved.paramClass.dataType == DataType.Boolean,
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
                  newResolved.paramClass.dataType == DataType.Boolean,
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

function updateRangeStart(
  mapping: DmxMapping,
  rangeIndex: number,
  newStart: number | boolean | undefined,
): DmxMapping {
  const newRange = {
    ...mapping.ranges[rangeIndex],
    start: newStart,
  };
  return {
    ...mapping,
    ranges: [
      ...mapping.ranges.slice(0, rangeIndex),
      newRange,
      ...mapping.ranges.slice(rangeIndex + 1),
    ],
  };
}

function updateRangeEnd(
  mapping: DmxMapping,
  rangeIndex: number,
  newEnd: number | boolean | undefined,
): DmxMapping {
  const newRange = {
    ...mapping.ranges[rangeIndex],
    end: newEnd,
  };
  return {
    ...mapping,
    ranges: [
      ...mapping.ranges.slice(0, rangeIndex),
      newRange,
      ...mapping.ranges.slice(rangeIndex + 1),
    ],
  };
}

function updateRangeDMXStart(
  mapping: DmxMapping,
  rangeIndex: number,
  newStart: number,
): DmxMapping {
  const newRange = {
    ...mapping.ranges[rangeIndex],
    chunkStart: newStart,
  };
  return {
    ...mapping,
    ranges: [
      ...mapping.ranges.slice(0, rangeIndex),
      newRange,
      ...mapping.ranges.slice(rangeIndex + 1),
    ],
  };
}

function updateRangeDMXEnd(
  mapping: DmxMapping,
  rangeIndex: number,
  newEnd: number,
): DmxMapping {
  const newRange = {
    ...mapping.ranges[rangeIndex],
    chunkEnd: newEnd,
  };
  return {
    ...mapping,
    ranges: [
      ...mapping.ranges.slice(0, rangeIndex),
      newRange,
      ...mapping.ranges.slice(rangeIndex + 1),
    ],
  };
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
