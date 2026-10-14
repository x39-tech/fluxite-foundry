import { beforeEach, describe, expect, it } from "vitest";
import { EntityId } from "app/persistentState";
import { useAppRuntimeStore } from "app/store";
import { resetAppRuntimeStore } from "test/utils";
import { buildUniverseFrame, setSacnOutputActive } from "./state";

describe("buildUniverseFrame", () => {
  it("places the footprint at the start address in a full universe", () => {
    const frame = buildUniverseFrame(new Uint8Array([10, 20, 30]), 5);

    expect(frame).toHaveLength(512);
    expect(Array.from(frame.subarray(0, 8))).toEqual([
      0, 0, 0, 0, 10, 20, 30, 0,
    ]);
  });

  it("drops the slots that fall past the end of the universe", () => {
    const frame = buildUniverseFrame(new Uint8Array([1, 2, 3]), 511);

    expect(frame).toHaveLength(512);
    expect(Array.from(frame.subarray(509))).toEqual([0, 1, 2]);
  });
});

describe("setSacnOutputActive", () => {
  const first = "first" as EntityId;
  const second = "second" as EntityId;
  const activeDocument = () =>
    useAppRuntimeStore.getState().sacnOutput.activeDocumentId;

  beforeEach(resetAppRuntimeStore);

  it("keeps the most recent document which requested sACN output", () => {
    setSacnOutputActive(first, true);
    setSacnOutputActive(second, true);

    expect(activeDocument()).toBe(second);
  });

  it("is a no-op when disabling a document that is not transmitting", () => {
    setSacnOutputActive(second, true);
    setSacnOutputActive(first, false);

    expect(activeDocument()).toBe(second);
  });
});
