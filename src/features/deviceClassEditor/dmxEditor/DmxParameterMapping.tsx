import { Button, HTMLTable, Tooltip } from "@blueprintjs/core";
import { DataType, Mapping, MappingRange, UnmappedParam } from "e173";
import { StringSelector } from "utils/components/StringSelector";
import { TextEditorField } from "utils/components/EditorFields/TextEditorField";
import { SelectField } from "utils/components/EditorFields/SelectField";
import { ParameterClassWithId } from "udr/udrDatabase";
import { useDarkMode } from "app/state";
import { useParametersWithClasses } from "../state";

interface DmxParameterMappingProps {
  mapping: Mapping;
  onUpdate: (mapping: Mapping) => void;
  onRemove: () => void;
}

export const DmxParameterMapping = ({
  mapping,
  onUpdate,
  onRemove,
}: DmxParameterMappingProps) => {
  const inDarkMode = useDarkMode();
  const background = inDarkMode ? "bg-gray-600" : "bg-gray-400";

  const paramsWithClasses = Object.fromEntries(
    Object.entries(useParametersWithClasses()).filter(([_, paramClass]) => {
      return (
        paramClass.dataType == DataType.Number ||
        paramClass.dataType == DataType.Boolean
      );
    }),
  );
  const mappedParameterCandidates = Object.keys(paramsWithClasses);
  const mappedParamClass = paramsWithClasses[mapping.mappedParam];
  const unmappedParameterCandidates = Object.keys(paramsWithClasses).filter(
    (param) => {
      return (
        param != mapping.mappedParam &&
        !mapping.unmappedParams?.some(
          (unmappedParam) => unmappedParam.parameter == param,
        )
      );
    },
  );

  let ranges = (
    <>
      <div>Parameter mapping has bad data</div>
    </>
  );
  let isOk = false;
  let isBoolean = false;

  if (
    mappedParameterCandidates.includes(mapping.mappedParam) &&
    mappedParamClass
  ) {
    try {
      switch (mappedParamClass.dataType) {
        case DataType.Number:
          break;
        case DataType.Boolean:
          isBoolean = true;
          break;
        default:
          throw new Error();
      }

      const addRangeButton = (
        <Tooltip content="Add Range">
          <Button
            icon="add"
            minimal
            onClick={() => {
              onUpdate({
                ...mapping,
                ranges: [...mapping.ranges, getNewRange(isBoolean)],
              });
            }}
          />
        </Tooltip>
      );

      ranges =
        mapping.ranges.length === 0 ? (
          addRangeButton
        ) : (
          <>
            <HTMLTable striped compact>
              <thead>
                <tr>
                  <td>Start</td>
                  <td>End</td>
                  <td>DMX Start</td>
                  <td>DMX End</td>
                </tr>
              </thead>
              <tbody>
                {mapping.ranges.map((range, index) => {
                  return getRangeTableRow(
                    index,
                    range,
                    mapping,
                    onUpdate,
                    isBoolean,
                  );
                })}
              </tbody>
            </HTMLTable>
            {addRangeButton}
          </>
        );
      isOk = true;
    } catch (_) {
      // Do nothing - error message will be displayed
    }
  }

  let unmappedParams = (
    <Tooltip content="Add Unmapped Parameter">
      <Button
        icon="add"
        minimal
        disabled={!isOk || unmappedParameterCandidates.length === 0}
        onClick={() => {
          const newParam = getNewUnmappedParam(
            unmappedParameterCandidates[0],
            paramsWithClasses[unmappedParameterCandidates[0]].dataType ==
              DataType.Boolean,
          );
          onUpdate({
            ...mapping,
            unmappedParams: mapping.unmappedParams
              ? [...mapping.unmappedParams, newParam]
              : [newParam],
          });
        }}
      />
    </Tooltip>
  );
  if (mapping.unmappedParams && mapping.unmappedParams.length > 0) {
    unmappedParams = (
      <>
        <HTMLTable striped compact>
          <thead>
            <tr>
              <td>Parameter</td>
              <td>Start</td>
              <td>End</td>
            </tr>
          </thead>
          <tbody>
            {mapping.unmappedParams.map((param, index) => {
              return getUnmappedParameterTableRow(
                index,
                param,
                paramsWithClasses,
                unmappedParameterCandidates,
                mapping,
                onUpdate,
              );
            })}
          </tbody>
        </HTMLTable>
        {unmappedParams}
      </>
    );
  }

  return (
    <div
      className={`${background} m-2 p-2 border-b border-gray-500 rounded flex flex-col`}
    >
      <div className="flex items-center">
        <div className="mx-1">Parameter:</div>
        <StringSelector
          className="!min-w-48"
          items={mappedParameterCandidates}
          selectedItem={mapping.mappedParam}
          onSelectedItemChanged={(newVal) =>
            onUpdate({ mappedParam: newVal, ranges: [] })
          }
        />
        <div className="grow" />
        <Button icon="delete" minimal={true} onClick={onRemove} />
      </div>
      <span className="font-bold mt-2 p-1">Mapping Ranges</span>
      {ranges}
      <span className="font-bold mt-2 p-1">Unmapped Parameters</span>
      {unmappedParams}
    </div>
  );
};

function getRangeTableRow(
  index: number,
  range: MappingRange,
  mapping: Mapping,
  onUpdate: (mapping: Mapping) => void,
  isBoolean: boolean,
): JSX.Element {
  if (isBoolean) {
    return getRangeTableRowBoolean(index, range, mapping, onUpdate);
  } else {
    return getRangeTableRowNumeric(index, range, mapping, onUpdate);
  }
}

function getRangeTableRowNumeric(
  index: number,
  range: MappingRange,
  mapping: Mapping,
  onUpdate: (mapping: Mapping) => void,
): JSX.Element {
  if (typeof range.start !== "number" || typeof range.end !== "number") {
    throw new Error();
  }

  return (
    <tr key={index}>
      <td className="!align-middle">
        <TextEditorField
          value={range.start.toString()}
          onValueChanged={(newValue) => {
            onUpdate(updateRangeStart(mapping, index, parseInt(newValue)));
          }}
        />
      </td>
      <td className="!align-middle">
        <TextEditorField
          value={range.end.toString()}
          onValueChanged={(newValue) => {
            onUpdate(updateRangeEnd(mapping, index, parseInt(newValue)));
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
        <Button
          icon="delete"
          minimal
          onClick={() => {
            onUpdate({
              ...mapping,
              ranges: [
                ...mapping.ranges.slice(0, index),
                ...mapping.ranges.slice(index + 1),
              ],
            });
          }}
        />
      </td>
    </tr>
  );
}

function getRangeTableRowBoolean(
  index: number,
  range: MappingRange,
  mapping: Mapping,
  onUpdate: (mapping: Mapping) => void,
): JSX.Element {
  const selectValues = ["false", "true"];

  if (typeof range.start !== "boolean" || typeof range.end !== "boolean") {
    throw new Error();
  }

  return (
    <tr key={index}>
      <td className="!align-middle">
        <SelectField
          values={selectValues}
          selectedValue={range.start.toString()}
          onSelectionChanged={(newValue) => {
            onUpdate(updateRangeStart(mapping, index, newValue === "true"));
          }}
        />
      </td>
      <td className="!align-middle">
        <SelectField
          values={selectValues}
          selectedValue={range.end.toString()}
          onSelectionChanged={(newValue) => {
            onUpdate(updateRangeEnd(mapping, index, newValue === "true"));
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
        <Button
          icon="delete"
          minimal
          onClick={() => {
            onUpdate({
              ...mapping,
              ranges: [
                ...mapping.ranges.slice(0, index),
                ...mapping.ranges.slice(index + 1),
              ],
            });
          }}
        />
      </td>
    </tr>
  );
}

function getNewRange(isBoolean: boolean): MappingRange {
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

const INVALID_UNMAPPED_PARAM_TABLE_ROW = (
  <tr>
    <td colSpan={3}>Invalid data in unmapped parameter</td>
  </tr>
);

function getUnmappedParameterTableRow(
  index: number,
  param: UnmappedParam,
  paramsWithClasses: Record<string, ParameterClassWithId>,
  eligibleParams: string[],
  mapping: Mapping,
  onUpdate: (mapping: Mapping) => void,
): JSX.Element {
  const paramClass = paramsWithClasses[param.parameter];
  if (!paramClass) {
    return INVALID_UNMAPPED_PARAM_TABLE_ROW;
  }

  switch (paramClass.dataType) {
    case DataType.Number:
      return getUnmappedParameterTableRowNumeric(
        index,
        param,
        paramsWithClasses,
        eligibleParams,
        mapping,
        onUpdate,
      );
    case DataType.Boolean:
      return getUnmappedParameterTableRowBoolean(
        index,
        param,
        paramsWithClasses,
        eligibleParams,
        mapping,
        onUpdate,
      );
    default:
      return INVALID_UNMAPPED_PARAM_TABLE_ROW;
  }
}

function getUnmappedParameterTableRowBoolean(
  index: number,
  param: UnmappedParam,
  paramsWithClasses: Record<string, ParameterClassWithId>,
  eligibleParams: string[],
  mapping: Mapping,
  onUpdate: (mapping: Mapping) => void,
): JSX.Element {
  const selectValues = ["false", "true"];

  const allEligibleParams = [...eligibleParams, param.parameter];

  return (
    <tr key={index}>
      <td>
        <StringSelector
          items={allEligibleParams}
          selectedItem={param.parameter}
          onSelectedItemChanged={(newValue) => {
            onUpdate({
              ...mapping,
              unmappedParams: [
                ...mapping.unmappedParams!.slice(0, index),
                getNewUnmappedParam(
                  newValue,
                  paramsWithClasses[newValue].dataType == DataType.Boolean,
                ),
                ...mapping.unmappedParams!.slice(index + 1),
              ],
            });
          }}
        />
      </td>
      <td>
        <SelectField
          values={selectValues}
          selectedValue={(param.start as boolean).toString()}
          onSelectionChanged={(newValue) => {
            onUpdate(updateRangeStart(mapping, index, newValue === "true"));
          }}
        />
      </td>
      <td>
        <SelectField
          values={selectValues}
          selectedValue={(param.end as boolean).toString()}
          onSelectionChanged={(newValue) => {
            onUpdate(updateRangeStart(mapping, index, newValue === "true"));
          }}
        />
      </td>
      <td>
        <Button
          icon="delete"
          minimal
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
        />
      </td>
    </tr>
  );
}

function getUnmappedParameterTableRowNumeric(
  index: number,
  param: UnmappedParam,
  paramsWithClasses: Record<string, ParameterClassWithId>,
  eligibleParams: string[],
  mapping: Mapping,
  onUpdate: (mapping: Mapping) => void,
): JSX.Element {
  const allEligibleParams = [...eligibleParams, param.parameter];

  return (
    <tr key={index}>
      <td>
        <StringSelector
          items={allEligibleParams}
          selectedItem={param.parameter}
          onSelectedItemChanged={(newValue) => {
            onUpdate({
              ...mapping,
              unmappedParams: [
                ...mapping.unmappedParams!.slice(0, index),
                getNewUnmappedParam(
                  newValue,
                  paramsWithClasses[newValue].dataType == DataType.Boolean,
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
            onUpdate(updateRangeStart(mapping, index, parseInt(newValue)));
          }}
        />
      </td>
      <td className="!align-middle">
        <TextEditorField
          value={param.start?.toString()}
          onValueChanged={(newValue) => {
            onUpdate(updateRangeStart(mapping, index, parseInt(newValue)));
          }}
        />
      </td>
      <td>
        <Button
          icon="delete"
          minimal
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
        />
      </td>
    </tr>
  );
}

function getNewUnmappedParam(param: string, isBoolean: boolean): UnmappedParam {
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
  mapping: Mapping,
  rangeIndex: number,
  newStart: number | boolean,
): Mapping {
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
  mapping: Mapping,
  rangeIndex: number,
  newEnd: number | boolean,
): Mapping {
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
  mapping: Mapping,
  rangeIndex: number,
  newStart: number,
): Mapping {
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
  mapping: Mapping,
  rangeIndex: number,
  newEnd: number,
): Mapping {
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
