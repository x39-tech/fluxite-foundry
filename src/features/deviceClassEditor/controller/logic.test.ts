import {
  DmxDriver,
  Parameter,
  ParameterConstraint,
  ParamReference,
} from "@cpwg-community/delver";
import { reconcileParamValues } from "./logic";

describe("reconcileParamValues function", () => {
  const paramDb: Record<string, Parameter> = {
    param1: {
      class: "foo",
      access: ["readTarget", "write"],
      lifetime: "runtime",
      minimum: 0,
      maximum: 100,
      default: 50,
    },
    param2: {
      class: "bar",
      access: ["readTarget", "write"],
      lifetime: "runtime",
      minimum: 0,
      maximum: 100,
    },
  };

  const param1Ref: ParamReference = { id: "param1" };
  const param2Ref: ParamReference = { id: "param2" };

  const constraints: Record<string, Record<number, ParameterConstraint>> = {
    param1: {
      0: {
        paramRange: { start: 0, end: 100 },
        dmxMapping: { chunkId: "b1", start: 0, end: 255 },
        calculated: false,
      },
    },
    param2: {
      0: {
        paramRange: { start: 0, end: 100 },
        dmxMapping: { chunkId: "b2", start: 0, end: 255 },
        calculated: false,
      },
    },
  };

  const dmxDriver: DmxDriver = {
    clusters: [
      {
        parameters: [param1Ref, param2Ref],
        combinations: [
          {
            constraints,
          },
        ],
      },
    ],
    chunks: {
      b1: {
        offsets: [0],
      },
      b2: {
        offsets: [1],
      },
    },
  };

  test("reconciles parameter state correctly when previously empty", () => {
    const result = reconcileParamValues(
      {
        params: {},
        dmxChunks: {},
      },
      paramDb,
      dmxDriver,
    );
    expect(result.params["param1"].value).toBe(50);
    expect(result.params["param1"].active).toBe(true);
    expect(result.params["param2"].value).toBe(0);
    expect(result.params["param1"].active).toBe(true);
    expect(result.dmxChunks["b1"]).toBe(128);
    expect(result.dmxChunks["b2"]).toBe(0);
  });
});
