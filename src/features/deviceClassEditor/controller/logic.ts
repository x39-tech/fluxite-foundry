import { DmxDriver, DmxMapping, Parameter, ParamRange } from "e173";

export interface ParamValue {
  value: number;
  active: boolean;
}

export interface ParamState {
  params: { [key: string]: ParamValue };
  dmxChunks: { [key: string]: number };
}

export function reconcileParamValues(
  paramValues: ParamState,
  paramDb: Record<string, Parameter>,
  dmxDriver: DmxDriver,
): ParamState {
  const newParamValues: { [key: string]: ParamValue } = {};
  const newDmxChunks = paramValues.dmxChunks;

  for (const cluster of dmxDriver.clusters) {
    const currentParams = Object.keys(paramValues.params);
    if (cluster.parameters.every((param) => currentParams.includes(param))) {
      for (const param of cluster.parameters) {
        newParamValues[param] = paramValues.params[param];
      }
      continue;
    }

    const firstCombo = cluster.combinations[0];
    for (const [param, constraint] of Object.entries(firstCombo.constraints)) {
      // TODO: destroy all parsers
      const parsedParam = param.match(/([^[]+)(\[(\d+)\])?/);
      if (!parsedParam) {
        console.error(`Invalid parameter name ${param}`);
        continue;
      }

      const paramName = parsedParam[1];
      const paramData = paramDb[paramName];

      if (constraint.paramRange) {
        newParamValues[param] = getParamInitialValue(
          paramData,
          constraint.paramRange,
        );
      }

      if (constraint.dmxMapping) {
        const paramValue = newParamValues[param]?.value;
        if (paramValue !== undefined) {
          newDmxChunks[constraint.dmxMapping.chunkId] = calculateDmxValue(
            paramValue,
            constraint.paramRange,
            constraint.dmxMapping,
          );
        } else {
          newDmxChunks[constraint.dmxMapping.chunkId] =
            constraint.dmxMapping.start;
        }
      }
    }
  }

  for (const chunk in dmxDriver.chunks) {
    if (!(chunk in newDmxChunks)) {
      newDmxChunks[chunk] = 0;
    }
  }

  return {
    params: newParamValues,
    dmxChunks: newDmxChunks,
  };
}

function getParamInitialValue(
  paramData: Parameter | undefined,
  paramRange: ParamRange,
): ParamValue {
  if (
    paramData &&
    paramData.default !== undefined &&
    typeof paramData.default === "number" &&
    paramData.default <= (paramRange!.end as number) &&
    paramData.default >= (paramRange!.start as number)
  ) {
    return { value: paramData.default, active: true };
  } else {
    return {
      value: paramRange!.start as number,
      active: true,
    };
  }
}

export function calculateDmxValue(
  paramValue: number,
  paramRange: ParamRange,
  dmxMapping: DmxMapping,
): number {
  const paramStart = paramRange!.start as number;
  const paramEnd = paramRange!.end as number;

  const paramSpan = paramEnd - paramStart;

  if (paramSpan > 0) {
    return Math.round(
      ((paramValue - paramStart) / paramSpan) *
        (dmxMapping.end - dmxMapping.start) +
        dmxMapping.start,
    );
  } else if (paramSpan == 0) {
    return dmxMapping.start;
  } else {
    // TODO
    return dmxMapping.start;
  }
}
