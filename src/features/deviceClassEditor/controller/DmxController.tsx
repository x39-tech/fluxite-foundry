import { useEffect, useRef, useState } from "react";
import { Button, HTMLSelect, Icon, Slider } from "@blueprintjs/core";
import {
  DataType,
  ParameterCluster,
  ParameterCombo,
  Unit,
  UnitName,
} from "e173";
import { useCurrentEditor, useParametersWithClasses } from "../state";
import { useDmxController } from "../dmxEditor/state";
import { TextEditorField } from "utils/components/EditorFields/TextEditorField";
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
  const editor = useCurrentEditor();
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
          universe: 2,
          offset: 0,
          slots,
        } as WebSocketPayload),
      );
    }
  }, [serverConnection.active, paramValues, dmxController]);

  const serverAreaBg = darkMode ? "bg-gray-800" : "bg-gray-200";

  if (!editor) {
    return <></>;
  }

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
    case "error":
      return (
        <p>{`Error compiling DMX test controller: ${dmxController.error.type}: ${dmxController.error.description}`}</p>
      );
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
        <HTMLSelect
          className="my-1"
          options={["hex", "decimal"]}
          value={dmxDisplayFormat}
          onChange={(e) =>
            setDmxDisplayFormat(e.target.value as "hex" | "decimal")
          }
        />
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
        parameters: cluster.parameters.toSorted(),
      }))
      .sort((a, b) =>
        (a.parameters[0] as string).localeCompare(b.parameters[0] as string),
      );

  return (
    <div className="flex flex-col h-full">
      {dmxDisplay}
      <div
        className={`${serverAreaBg} flex justify-center items-center gap-2 p-1`}
      >
        <span className="font-bold">Server</span>
        <span>Address and Port:</span>
        <TextEditorField
          value={serverConnection.addressAndPort}
          onValueChanged={(value) =>
            setServerConnection({ ...serverConnection, addressAndPort: value })
          }
        />
        <span>
          Status:{" "}
          {serverConnection.active ? (
            <>
              <span className="mr-2">Connected</span>
              <Icon icon="tick" />
            </>
          ) : (
            <>
              <span className="mr-2">Disconnected</span>
              <Icon icon="cross" />
            </>
          )}
        </span>
        <Button
          color="green"
          onClick={() => {
            const ws = new WebSocket(`ws://${serverConnection.addressAndPort}`);
            ws.onopen = () => {
              setServerConnection({ ...serverConnection, active: true });
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
                const parsedParam = parameter.match(/([^[]+)(\[(\d+)\])?/);
                if (!parsedParam) {
                  return <></>;
                }

                const paramName = parsedParam[1];
                const param = dmxController.db.parameters[paramName];
                const paramClass = paramClasses[paramName];
                if (!paramClass) {
                  return <></>;
                }

                if (paramClass.dataType == DataType.Number) {
                  if ("minimum" in param && "maximum" in param) {
                    const min = param.minimum as number;
                    const max = param.maximum as number;

                    const active = paramValues.params[parameter]?.active;

                    return (
                      <div key={index} className="flex items-center">
                        <span className="mx-4">
                          {parameter}
                          {getUnitString(paramClass.unit)}
                        </span>
                        <div className="grow" />
                        <Slider
                          className={`max-w-96 mx-4 ${!active ? "opacity-50" : ""}`}
                          min={min}
                          max={max}
                          value={paramValues.params[parameter]?.value}
                          onChange={(value) => {
                            setParamValue(
                              paramValues,
                              setParamValues,
                              cluster,
                              parameter,
                              value,
                            );
                          }}
                          labelValues={[]}
                          showTrackFill={false}
                          stepSize={getSliderStepSize(min, max)}
                        />
                      </div>
                    );
                  }
                  return <></>;
                } else if (paramClass.dataType == DataType.Boolean) {
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

function getUnitString(unit: Unit | undefined): string {
  if (!unit) {
    return "";
  }

  if (unit.name == UnitName.None) {
    return "";
  } else if (
    unit.name == UnitName.Other ||
    unit.name == UnitName.Ratio ||
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
  parameter: string,
  value: number,
) {
  const candidates = cluster.combinations.filter((combo) => {
    const constraint = combo.constraints[parameter];
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
      if (
        !candidate.constraints[parameter].paramRange ||
        !candidate.constraints[parameter].dmxMapping
      ) {
        return acc;
      }

      const curNumAdjustments = acc
        ? getNumberOfParamsToBeAdjusted(paramValues, acc, parameter)
        : 0;
      const numAdjustments = getNumberOfParamsToBeAdjusted(
        paramValues,
        candidate,
        parameter,
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
  for (const [param, constraint] of Object.entries(
    winningCandidate.constraints,
  )) {
    if (param == parameter) {
      newParamValues[param] = { value, active: true };
      newDmxChunks[constraint.dmxMapping!.chunkId] = calculateDmxValue(
        value,
        constraint.paramRange,
        constraint.dmxMapping!,
      );
    } else {
      const paramCurValue = paramValues.params[param]?.value;
      if (paramCurValue !== undefined) {
        if (constraint.paramRange) {
          if (paramCurValue < (constraint.paramRange.start as number)) {
            newParamValues[param] = {
              value: constraint.paramRange.start as number,
              active: true,
            };
          } else if (paramCurValue > (constraint.paramRange.end as number)) {
            newParamValues[param] = {
              value: constraint.paramRange.end as number,
              active: true,
            };
          } else {
            newParamValues[param] = {
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
          newParamValues[param] = {
            value: paramCurValue,
            active: false,
          };
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
  excludeParam: string,
) {
  return Object.entries(combination.constraints).reduce(
    (acc, [param, constraint]) => {
      const paramValue = paramValues.params[param]!;
      const paramWillChangeActivity = paramValue
        ? paramValue.active != !constraint.calculated
        : !constraint.calculated;
      const paramWillChangeRange =
        constraint.paramRange &&
        paramValue !== undefined &&
        (paramValue.value < (constraint.paramRange.start as number) ||
          paramValue.value > (constraint.paramRange.end as number));

      if (
        param !== excludeParam &&
        (paramWillChangeActivity || paramWillChangeRange)
      ) {
        return acc + 1;
      } else {
        return acc;
      }
    },
    0,
  );
}
