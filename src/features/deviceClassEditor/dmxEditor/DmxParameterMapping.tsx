import { useId, useState } from "react";
import { PlusIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import {
  CodexId,
  DmxMapping,
  DmxMappingRange,
  DmxUnmappedParam,
  fcDataTypes,
  ParameterReference,
} from "app/persistentState";
import { StringSelector } from "components/StringSelector";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { Button } from "components/scn-ui/Button";
import { TextEditorField } from "components/EditorFields/TextEditorField";
import { SelectField } from "components/EditorFields/SelectField";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/scn-ui/Table";
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

const SectionHeading = ({
  children,
  addLabel,
  disabled,
  onAdd,
}: {
  children: string;
  addLabel: string;
  disabled?: boolean;
  onAdd: () => void;
}) => (
  <div className="flex items-center gap-1">
    <span className="text-sm font-semibold">{children}</span>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary"
          aria-label={addLabel}
          disabled={disabled}
          onClick={onAdd}
        >
          <PlusIcon className="size-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{addLabel}</TooltipContent>
    </Tooltip>
  </div>
);

export const DmxParameterMapping = ({
  mapping,
  onUpdate,
  onRemove,
}: DmxParameterMappingProps) => {
  const [editingRangeIndex, setEditingRangeIndex] = useState<number | null>(
    null,
  );
  const [isAddingRange, setIsAddingRange] = useState(false);
  const idPrefix = useId();

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
    <div className="flex items-end gap-2">
      <FieldSet>
        <Label htmlFor={`${idPrefix}-parameter`}>Parameter</Label>
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
      </FieldSet>
      <Button variant="ghost" className="text-primary" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );

  const addUnmappedParam = () => {
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
  };

  // Invalid mapping: show error state with disabled controls
  if (!isValidMapping) {
    return (
      <div className="flex flex-col gap-2 border-l border-primary/40 pl-4">
        {header}
        <SectionHeading addLabel="Add Range" disabled onAdd={() => {}}>
          Mapping Ranges
        </SectionHeading>
        <div className="text-sm">Parameter mapping has bad data</div>
        <SectionHeading
          addLabel="Add Unmapped Parameter"
          disabled
          onAdd={() => {}}
        >
          Unmapped Parameters
        </SectionHeading>
      </div>
    );
  }

  // Valid mapping: extract data with proper types
  const { paramClass, enumChoices } = mappedParamMappable;
  const dataType = paramClass.dataType;

  const editingRange =
    editingRangeIndex !== null ? mapping.ranges[editingRangeIndex] : null;

  return (
    <div className="flex flex-col gap-2 border-l border-primary/40 pl-4">
      {header}
      <SectionHeading addLabel="Add Range" onAdd={() => setIsAddingRange(true)}>
        Mapping Ranges
      </SectionHeading>
      <div className="flex flex-col gap-2">
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
      </div>
      <SectionHeading
        addLabel="Add Unmapped Parameter"
        disabled={unmappedParameterCandidates.length === 0}
        onAdd={addUnmappedParam}
      >
        Unmapped Parameters
      </SectionHeading>
      {mapping.unmappedParams && mapping.unmappedParams.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parameter</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
          </TableBody>
        </Table>
      )}

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
    <div className="flex items-center justify-between gap-2 rounded-sm bg-background px-4 py-3 shadow-sm">
      <MappingRangeText range={range} enumChoices={enumChoices} />
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={onEdit}
        >
          Edit
        </Button>
        <span aria-hidden className="text-input">
          |
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete range"
          onClick={onDelete}
        >
          <XIcon className="size-4" />
        </Button>
      </div>
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
  <TableRow>
    <TableCell colSpan={4}>Invalid data in unmapped parameter</TableCell>
  </TableRow>
);

const RemoveUnmappedParamButton = ({ onClick }: { onClick: () => void }) => (
  <Button variant="ghost" size="sm" className="text-primary" onClick={onClick}>
    Remove
  </Button>
);

interface UnmappedParameterTableRowProps {
  index: number;
  param: DmxUnmappedParam;
  mappableParams: Record<CodexId, MappableParameter>;
  eligibleCandidates: ParameterCandidate[];
  mapping: DmxMapping;
  onUpdate: (mapping: DmxMapping) => void;
}

const UnmappedParameterTableRow = (props: UnmappedParameterTableRowProps) => {
  const mappable = props.mappableParams[props.param.parameter.codexId];
  if (!mappable) {
    return <InvalidUnmappedParamTableRow />;
  }

  switch (mappable.paramClass.dataType) {
    case fcDataTypes.NUMBER:
      return <UnmappedParameterTableRowNumeric {...props} />;
    case fcDataTypes.BOOLEAN:
      return <UnmappedParameterTableRowBoolean {...props} />;
    case fcDataTypes.ENUM:
      return <UnmappedParameterTableRowEnum {...props} />;
    default:
      return <InvalidUnmappedParamTableRow />;
  }
};

const UnmappedParameterTableRowBoolean = ({
  index,
  param,
  mappableParams,
  eligibleCandidates,
  mapping,
  onUpdate,
}: UnmappedParameterTableRowProps) => {
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
    <TableRow>
      <TableCell>
        <StringSelector
          items={allEligibleStrs}
          selectedItem={paramStr}
          onSelectedItemChanged={(newValue) =>
            onUpdate(
              replaceUnmappedParam(mapping, index, newValue, mappableParams),
            )
          }
        />
      </TableCell>
      <TableCell>
        <SelectField
          className="w-24"
          values={selectValues}
          selectedValue={(param.start as boolean).toString()}
          onSelectionChanged={(newValue) => {
            onUpdate(
              updateUnmappedParamStart(mapping, index, newValue === "true"),
            );
          }}
        />
      </TableCell>
      <TableCell>
        <SelectField
          className="w-24"
          values={selectValues}
          selectedValue={(effectiveEnd as boolean).toString()}
          onSelectionChanged={handleEndChange}
        />
      </TableCell>
      <TableCell className="text-right">
        <RemoveUnmappedParamButton
          onClick={() => onUpdate(removeUnmappedParam(mapping, index))}
        />
      </TableCell>
    </TableRow>
  );
};

const UnmappedParameterTableRowNumeric = ({
  index,
  param,
  mappableParams,
  eligibleCandidates,
  mapping,
  onUpdate,
}: UnmappedParameterTableRowProps) => {
  const paramStr = serializeParameterReference(param.parameter);
  const allEligibleStrs = [...eligibleCandidates.map((c) => c.str), paramStr];

  const effectiveEnd = getEffectiveEnd(param.start, param.end);

  const handleEndChange = (newValue: string) => {
    const parsed = parseInt(newValue);
    const normalized = normalizeEndValue(param.start, parsed);
    onUpdate(updateUnmappedParamEnd(mapping, index, normalized));
  };

  return (
    <TableRow>
      <TableCell>
        <StringSelector
          items={allEligibleStrs}
          selectedItem={paramStr}
          onSelectedItemChanged={(newValue) =>
            onUpdate(
              replaceUnmappedParam(mapping, index, newValue, mappableParams),
            )
          }
        />
      </TableCell>
      <TableCell>
        <TextEditorField
          className="w-24"
          aria-label="Start"
          value={param.start?.toString() ?? ""}
          onConfirm={(newValue) => {
            onUpdate(
              updateUnmappedParamStart(mapping, index, parseInt(newValue)),
            );
          }}
        />
      </TableCell>
      <TableCell>
        <TextEditorField
          className="w-24"
          aria-label="End"
          value={effectiveEnd?.toString() ?? ""}
          onConfirm={handleEndChange}
        />
      </TableCell>
      <TableCell className="text-right">
        <RemoveUnmappedParamButton
          onClick={() => onUpdate(removeUnmappedParam(mapping, index))}
        />
      </TableCell>
    </TableRow>
  );
};

const UnmappedParameterTableRowEnum = ({
  index,
  param,
  mappableParams,
  eligibleCandidates,
  mapping,
  onUpdate,
}: UnmappedParameterTableRowProps) => {
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
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <StringSelector
            items={allEligibleStrs}
            selectedItem={paramStr}
            onSelectedItemChanged={(newValue) =>
              onUpdate(
                replaceUnmappedParam(mapping, index, newValue, mappableParams),
              )
            }
          />
          {hasNoChoices && (
            <Tooltip>
              <TooltipTrigger asChild>
                <TriangleAlertIcon className="size-5 text-orange-500 shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                No enum choices are defined for this parameter. The parameter
                class or instance must define choices for enum values to be
                selectable.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell className="text-right">
        <RemoveUnmappedParamButton
          onClick={() => onUpdate(removeUnmappedParam(mapping, index))}
        />
      </TableCell>
    </TableRow>
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

/** Swaps the parameter an unmapped entry points at, resetting its bounds. */
function replaceUnmappedParam(
  mapping: DmxMapping,
  paramIndex: number,
  newValue: string,
  mappableParams: Record<CodexId, MappableParameter>,
): DmxMapping {
  const newRef = parseParameterReference(newValue);
  const newMappable = mappableParams[newRef.codexId];
  return {
    ...mapping,
    unmappedParams: [
      ...mapping.unmappedParams!.slice(0, paramIndex),
      getNewUnmappedParam(
        newRef,
        newMappable.paramClass.dataType,
        newMappable.enumChoices,
      ),
      ...mapping.unmappedParams!.slice(paramIndex + 1),
    ],
  };
}

function removeUnmappedParam(
  mapping: DmxMapping,
  paramIndex: number,
): DmxMapping {
  return {
    ...mapping,
    unmappedParams:
      mapping.unmappedParams!.length === 1
        ? undefined
        : [
            ...mapping.unmappedParams!.slice(0, paramIndex),
            ...mapping.unmappedParams!.slice(paramIndex + 1),
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
