import { describe, test, expect } from "vitest";
import { migrateV1toV2 } from "./migrate";
import { AppPersistentState as V1State } from "../v1/state";
import { AppStateSchema as V2Schema } from "./state";

function createMinimalV1State(darkMode: boolean): V1State {
  return {
    appSettings: {
      darkMode,
      orgId: { type: "user", id: "test-user-id" },
      locale: "en-US",
    },
    openEditors: {
      editors: [],
      selectedEditor: -1,
    },
    deviceClassEditors: {},
  };
}

describe("migrateV1toV2", () => {
  test("migrates darkMode: true to theme: 'dark'", () => {
    const v1State = createMinimalV1State(true);
    const v2State = migrateV1toV2(v1State);

    expect(v2State.appSettings.theme).toBe("dark");
    expect(v2State.appSettings).not.toHaveProperty("darkMode");
  });

  test("migrates darkMode: false to theme: 'light'", () => {
    const v1State = createMinimalV1State(false);
    const v2State = migrateV1toV2(v1State);

    expect(v2State.appSettings.theme).toBe("light");
    expect(v2State.appSettings).not.toHaveProperty("darkMode");
  });

  test("preserves other appSettings properties", () => {
    const v1State = createMinimalV1State(true);
    const v2State = migrateV1toV2(v1State);

    expect(v2State.appSettings.orgId).toEqual(v1State.appSettings.orgId);
    expect(v2State.appSettings.locale).toBe(v1State.appSettings.locale);
  });

  test("preserves other top-level state properties", () => {
    const v1State = createMinimalV1State(false);
    const v2State = migrateV1toV2(v1State);

    expect(v2State.openEditors).toEqual(v1State.openEditors);
    expect(v2State.deviceClassEditors).toEqual(v1State.deviceClassEditors);
  });

  test("produces valid V2 state", () => {
    const v1State = createMinimalV1State(true);
    const v2State = migrateV1toV2(v1State);

    const result = V2Schema.safeParse(v2State);
    expect(result.success).toBe(true);
  });
});
