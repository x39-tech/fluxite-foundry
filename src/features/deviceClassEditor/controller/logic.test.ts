import { DmxDriver, Lifetime, Parameter, ParameterAccess } from "e173";
import { reconcileParamValues } from "./logic";

describe("reconcileParamValues function", () => {
  const paramDb: Record<string, Parameter> = {
    param1: {
      class: "foo",
      access: [ParameterAccess.ReadTarget, ParameterAccess.Write],
      lifetime: Lifetime.Runtime,
      minimum: 0,
      maximum: 100,
      default: 50,
    },
    param2: {
      class: "bar",
      access: [ParameterAccess.ReadTarget, ParameterAccess.Write],
      lifetime: Lifetime.Runtime,
      minimum: 0,
      maximum: 100,
    },
  };

  const dmxDriver: DmxDriver = {
    clusters: [
      {
        parameters: ["param1", "param2"],
        combinations: [
          {
            constraints: {
              param1: {
                paramRange: { start: 0, end: 100 },
                dmxMapping: { chunkId: "b1", start: 0, end: 255 },
                calculated: false,
              },
              param2: {
                paramRange: { start: 0, end: 100 },
                dmxMapping: { chunkId: "b2", start: 0, end: 255 },
                calculated: false,
              },
            },
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
