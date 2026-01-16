import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";
import {
  ParamReference,
  ParameterCluster,
  ParameterCombo,
  ParameterConstraint,
} from "@cpwg-community/delver";
import { CodexId, fcDataTypes, FCUnit, fcUnitNames } from "app/persistentState";
import { useParametersWithClasses } from "../state";
import { useDmxController } from "../dmxEditor/state";
import { Button } from "components/scn-ui/Button";
import { Slider } from "components/scn-ui/Slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/scn-ui/Select";
import { TextEditorField } from "components/EditorFields/DeprecatedTextEditorField";
import { useDarkMode } from "app/store";
import {
  calculateDmxValue,
  ParamState,
  ParamValue,
  reconcileParamValues,
} from "./logic";

interface DmxDisplay {
  slots: {
    [key: number]: { chunk: string; chunkOffset: number; totalOffsets: number };
  };
  maxSlot: number;
}

interface ServerConnection {
  active: boolean;
  addressAndPort: string;
}

interface WebSocketPayload {
  universe: number;
  offset: number;
  slots: number[];
}

export const DmxController = () => {
  const paramClasses = useParametersWithClasses();
  const dmxController = useDmxController();
  const [paramValues, setParamValues] = useState<ParamState>({
    params: {},
    dmxChunks: {},
  });
  const [dmxDisplayFormat, setDmxDisplayFormat] = useState<"hex" | "decimal">(
    "hex",
  );
  const [serverConnection, setServerConnection] = useState<ServerConnection>({
    active: false,
    addressAndPort: "",
  });
  const websocketConnRef = useRef<WebSocket | null>(null);
  const darkMode = useDarkMode();

  // Update the param values when the set of parameters in the DMX controller changes
  useEffect(() => {
    if (dmxController.state === "available" && dmxController.db.dmxDriver) {
      setParamValues(
        reconcileParamValues(
          paramValues,
          dmxController.db.parameters,
          dmxController.db.dmxDriver,
        ),
      );
    }
  }, [dmxController]);

  // Send websocket data when relevant state changes
  useEffect(() => {
    if (serverConnection.active && websocketConnRef.current) {
      const slots = [...Array(dmxDisplayData.maxSlot + 1).keys()].map(
        (slotIndex) => {
          const slotData = dmxDisplayData.slots[slotIndex];
          if (slotData) {
            let val = paramValues.dmxChunks[slotData.chunk];
            if (val) {
              val =
                (val >>
                  ((slotData.totalOffsets - (slotData.chunkOffset + 1)) * 8)) &
                0xff;
            }
            return val;
          } else {
            return 0;
          }
        },
      );

      websocketConnRef.current.send(
        JSON.stringify({
          universe: 1,
          offset: 0,
          slots,
        } as WebSocketPayload),
      );
    }
  }, [serverConnection.active, paramValues, dmxController]);

  const serverAreaBg = darkMode ? "bg-gray-800" : "bg-gray-200";

  switch (dmxController.state) {
    case "available":
      if (!dmxController.db.dmxDriver) {
        return (
          <p>
            Add a DMX parameter mapping in the DMX editor to use the test
            controller.
          </p>
        );
      }
      break;
    case "not-created":
      return (
        <p>
          Add a DMX parameter mapping in the DMX editor to use the test
          controller.
        </p>
      );
    case "error": {
      const pathText = dmxController.error.path
        ? ` (at ${dmxController.error.path})`
        : "";
      return (
        <p>{`Error compiling DMX test controller: ${dmxController.error.type}: ${dmxController.error.description}${pathText}`}</p>
      );
    }
  }

  const dmxDisplayData = Object.entries(
    dmxController.db.dmxDriver.chunks,
  ).reduce(
    (acc, [chunkId, chunk]) => {
      chunk.offsets.forEach((offset, index) => {
        acc.slots[offset] = {
          chunk: chunkId,
          chunkOffset: index,
          totalOffsets: chunk.offsets.length,
        };
        if (offset > acc.maxSlot) {
          acc.maxSlot = offset;
        }
      });
      return acc;
    },
    { slots: {}, maxSlot: 0 } as DmxDisplay,
  );

  const dmxDisplay = (
    <div className="flex flex-row items-center justify-center mt-2 mb-4 sticky">
      <div className="flex flex-col">
        <span className="mx-4 font-bold">DMX Output</span>
        <Select
          value={dmxDisplayFormat}
          onValueChange={(value) =>
            setDmxDisplayFormat(value as "hex" | "decimal")
          }
        >
          <SelectTrigger className="my-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hex">hex</SelectItem>
            <SelectItem value="decimal">decimal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col items-stretch">
        <div className="flex flex-row" key={0}>
          <div key={0} className="flex items-center justify-center w-12 h-8" />
          {[...Array(8).keys()].map((index) => (
            <div
              className="flex items-center justify-center w-12 h-8"
              key={index + 1}
            >
              {index + 1}
            </div>
          ))}
        </div>
        {[...Array(Math.floor(dmxDisplayData.maxSlot / 8) + 1).keys()].map(
          (outerIndex) => {
            const columnCount =
              outerIndex == Math.floor(dmxDisplayData.maxSlot / 8)
                ? (dmxDisplayData.maxSlot % 8) + 1
                : 8;
            return (
              <div className="flex flex-row" key={outerIndex + 1}>
                <div className="flex items-center justify-center w-12 h-8">
                  {outerIndex * 8}
                </div>
                {[...Array(columnCount).keys()].map((index) => {
                  const slotIndex = outerIndex * 8 + index;
                  const slotData = dmxDisplayData.slots[slotIndex];
                  if (slotData) {
                    let val = paramValues.dmxChunks[slotData.chunk];
                    if (val) {
                      val =
                        (val >>
                          ((slotData.totalOffsets -
                            (slotData.chunkOffset + 1)) *
                            8)) &
                        0xff;
                    }
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-center border border-gray-500 w-12 h-8"
                      >
                        {val?.toString(dmxDisplayFormat == "hex" ? 16 : 10) ||
                          " "}
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={index}
                        className="flex items-center border w-12 h-8"
                      >
                        {"<>"}
                      </div>
                    );
                  }
                })}
              </div>
            );
          },
        )}
      </div>
    </div>
  );

  const clustersOrdered: ParameterCluster[] =
    dmxController.db.dmxDriver.clusters
      .map((cluster) => ({
        combinations: cluster.combinations,
        parameters: cluster.parameters.toSorted((a, b) =>
          serializeParamRef(a).localeCompare(serializeParamRef(b)),
        ),
      }))
      .sort((a, b) =>
        serializeParamRef(a.parameters[0]).localeCompare(
          serializeParamRef(b.parameters[0]),
        ),
      );

  return (
    <div className="flex flex-col h-full">
      {dmxDisplay}
      <div
        className={`${serverAreaBg} flex flex-wrap justify-center items-center gap-2 p-1`}
      >
        <span className="font-bold">Server</span>
        <span>Address and Port:</span>
        <TextEditorField
          value={serverConnection.addressAndPort}
          onValueChanged={(value) =>
            setServerConnection({ ...serverConnection, addressAndPort: value })
          }
        />
        <span className="flex items-center">
          Status:{" "}
          {serverConnection.active ? (
            <>
              <span className="mr-2">Connected</span>
              <CheckIcon className="size-5" />
            </>
          ) : (
            <>
              <span className="mr-2">Disconnected</span>
              <XMarkIcon className="size-5" />
            </>
          )}
        </span>
        <Button
          size="sm"
          onClick={() => {
            const ws = new WebSocket(`ws://${serverConnection.addressAndPort}`);
            ws.onopen = () => {
              setServerConnection({ ...serverConnection, active: true });
            };
            ws.onclose = () => {
              toast(`DMX server connection closed`);
              setServerConnection({ ...serverConnection, active: false });
            };
            ws.onerror = () => {
              toast(`DMX server connection failed`);
              setServerConnection({ ...serverConnection, active: false });
            };
            websocketConnRef.current = ws;
          }}
        >
          {serverConnection.active ? "Disconnect" : "Connect"}
        </Button>
      </div>
      <div className="overflow-auto">
        {clustersOrdered.map((cluster, index) => {
          return (
            <div key={index} className="flex flex-col border-b py-2">
              {cluster.parameters.map((parameter, index) => {
                const paramKey = serializeParamRef(parameter);
                const param = dmxController.db.parameters[parameter.id];
                const paramClass = paramClasses[CodexId(parameter.id)];
                if (!param || !paramClass) {
                  return <></>;
                }

                if (paramClass.paramClass.dataType == fcDataTypes.NUMBER) {
                  if ("minimum" in param && "maximum" in param) {
                    const min = param.minimum as number;
                    const max = param.maximum as number;

                    const active = paramValues.params[paramKey]?.active;

                    return (
                      <div key={index} className="flex items-center py-2">
                        <span className="mx-4">
                          {paramKey}
                          {getUnitString(paramClass.paramClass.unit)}
                        </span>
                        <div className="grow" />
                        <Slider
                          className={`max-w-96 mx-4 ${!active ? "opacity-50" : ""}`}
                          min={min}
                          max={max}
                          value={[paramValues.params[paramKey]?.value]}
                          onValueChange={(values) => {
                            setParamValue(
                              paramValues,
                              setParamValues,
                              cluster,
                              parameter,
                              values[0],
                            );
                          }}
                          step={getSliderStepSize(min, max)}
                        />
                      </div>
                    );
                  }
                  return <></>;
                } else if (
                  paramClass.paramClass.dataType == fcDataTypes.BOOLEAN
                ) {
                  return <></>;
                } else {
                  return <></>;
                }
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SI_PREFIXES: { [key: number]: string } = {
  // I hate javascript
  "-24": "yocto",
  "-21": "zepto",
  "-18": "atto",
  "-15": "femto",
  "-12": "pico",
  "-9": "nano",
  "-6": "micro",
  "-3": "milli",
  "0": "",
  "3": "kilo",
  "6": "mega",
  "9": "giga",
  "12": "tera",
  "15": "peta",
  "18": "exa",
  "21": "zetta",
  "24": "yotta",
};

function getUnitString(unit: FCUnit | undefined): string {
  if (!unit) {
    return "";
  }

  if (unit.name == fcUnitNames.NONE) {
    return "";
  } else if (
    unit.name == fcUnitNames.OTHER ||
    unit.name == fcUnitNames.RATIO ||
    !unit.exponent
  ) {
    return ` (${unit.name})`;
  } else if (unit.exponent in SI_PREFIXES) {
    return ` (${SI_PREFIXES[unit.exponent]}${unit.name})`;
  } else {
    return ` (${unit.name} * 10^${unit.exponent})`;
  }
}

function getSliderStepSize(min: number, max: number): number {
  // Default 1, but ensure at least 50 steps
  let stepSize = 1;
  if (min >= max) {
    return stepSize;
  }
  while ((max - min) / stepSize < 50) {
    stepSize /= 10;
  }
  return stepSize;
}

function setParamValue(
  paramValues: ParamState,
  setParamValues: (paramValues: ParamState) => void,
  cluster: ParameterCluster,
  parameter: ParamReference,
  value: number,
) {
  const paramKey = serializeParamRef(parameter);
  const candidates = cluster.combinations.filter((combo) => {
    const constraint = getConstraintForParam(combo.constraints, parameter);
    return (
      constraint &&
      constraint.paramRange &&
      value >= (constraint.paramRange.start as number) &&
      value <= (constraint.paramRange.end as number)
    );
  });

  if (candidates.length == 0) {
    return;
  }

  const winningCandidate = candidates.reduce(
    (acc, candidate) => {
      const constraint = getConstraintForParam(
        candidate.constraints,
        parameter,
      );
      if (!constraint?.paramRange || !constraint?.dmxMapping) {
        return acc;
      }

      const curNumAdjustments = acc
        ? getNumberOfParamsToBeAdjusted(paramValues, acc, paramKey)
        : 0;
      const numAdjustments = getNumberOfParamsToBeAdjusted(
        paramValues,
        candidate,
        paramKey,
      );

      if (acc === null || numAdjustments < curNumAdjustments) {
        return candidate;
      } else {
        return acc;
      }
    },
    null as ParameterCombo | null,
  );

  if (!winningCandidate) {
    return;
  }

  const newParamValues: { [key: string]: ParamValue } = {};
  const newDmxChunks: { [key: string]: number } = {};
  for (const [paramId, indexMap] of Object.entries(
    winningCandidate.constraints,
  )) {
    for (const [index, constraint] of Object.entries(indexMap)) {
      const thisParamKey = serializeParamRefFromParts(paramId, Number(index));
      if (thisParamKey == paramKey) {
        newParamValues[thisParamKey] = { value, active: true };
        newDmxChunks[constraint.dmxMapping!.chunkId] = calculateDmxValue(
          value,
          constraint.paramRange,
          constraint.dmxMapping!,
        );
      } else {
        const paramCurValue = paramValues.params[thisParamKey]?.value;
        if (paramCurValue !== undefined) {
          if (constraint.paramRange) {
            if (paramCurValue < (constraint.paramRange.start as number)) {
              newParamValues[thisParamKey] = {
                value: constraint.paramRange.start as number,
                active: true,
              };
            } else if (paramCurValue > (constraint.paramRange.end as number)) {
              newParamValues[thisParamKey] = {
                value: constraint.paramRange.end as number,
                active: true,
              };
            } else {
              newParamValues[thisParamKey] = {
                value: paramCurValue,
                active: true,
              };
            }

            if (constraint.dmxMapping) {
              newDmxChunks[constraint.dmxMapping.chunkId] = calculateDmxValue(
                paramCurValue,
                constraint.paramRange,
                constraint.dmxMapping,
              );
            }
          } else {
            newParamValues[thisParamKey] = {
              value: paramCurValue,
              active: false,
            };
          }
        }
      }
    }
  }

  setParamValues({
    params: {
      ...paramValues.params,
      ...newParamValues,
    },
    dmxChunks: {
      ...paramValues.dmxChunks,
      ...newDmxChunks,
    },
  });
}

function getNumberOfParamsToBeAdjusted(
  paramValues: ParamState,
  combination: ParameterCombo,
  excludeParamKey: string,
) {
  let count = 0;
  for (const [paramId, indexMap] of Object.entries(combination.constraints)) {
    for (const [index, constraint] of Object.entries(indexMap)) {
      const paramKey = serializeParamRefFromParts(paramId, Number(index));
      const paramValue = paramValues.params[paramKey]!;
      const paramWillChangeActivity = paramValue
        ? paramValue.active != !constraint.calculated
        : !constraint.calculated;
      const paramWillChangeRange =
        constraint.paramRange &&
        paramValue !== undefined &&
        (paramValue.value < (constraint.paramRange.start as number) ||
          paramValue.value > (constraint.paramRange.end as number));

      if (
        paramKey !== excludeParamKey &&
        (paramWillChangeActivity || paramWillChangeRange)
      ) {
        count++;
      }
    }
  }
  return count;
}

function serializeParamRef(ref: ParamReference): string {
  if (ref.index !== undefined && ref.index !== 0) {
    return `${ref.id}[${ref.index}]`;
  }
  return ref.id;
}

function serializeParamRefFromParts(id: string, index: number): string {
  if (index !== 0) {
    return `${id}[${index}]`;
  }
  return id;
}

function getConstraintForParam(
  constraints: Record<string, Record<number, ParameterConstraint>>,
  parameter: ParamReference,
): ParameterConstraint | undefined {
  return constraints[parameter.id]?.[parameter.index ?? 0];
}
