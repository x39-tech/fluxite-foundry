import { getDefaultWindowLayout } from "utils/utils";
import { migrateState } from "./stateMigrations";

test("Migrates from state v4", () => {
  const migrated = migrateState(
    {
      udrDatabase: {
        itemClasses: {
          parameters: [
            {
              foo: "bar",
            },
          ],
          structures: [{ foo: "bar" }],
        },
        libraries: {
          "org.esta.intensity-color": {
            "1.0.0": {
              "@description": "esta_intensity-color_library",
              publishDate: "1970-01-01T00:00:00Z",
              author: "ESTA",
              parameterClasses: {},
            },
          },
        },
      },
      deviceClassEditors: {
        foo: {
          deviceClassId: "foo",
          basicData: { foo: "bar1" },
          libraries: { foo: "bar2" },
          deviceLibrary: { foo: "bar3" },
          parameters: { foo: "bar4" },
          structures: { foo: "bar5" },
          dmx: { foo: "bar6" },
          localizations: { foo: "bar7" },
          windowLayout: { foo: "bar8" },
        },
        baz: {
          deviceClassId: "foo",
          basicData: { foo: "baz1" },
          libraries: { foo: "baz2" },
          deviceLibrary: { foo: "baz3" },
          parameters: { foo: "baz4" },
          structures: { foo: "baz5" },
          dmx: { foo: "baz6" },
          localizations: { foo: "baz7" },
          windowLayout: { foo: "baz8" },
        },
      },
      appSettings: {
        darkMode: true,
      },
      openEditors: {
        editors: [
          {
            type: "deviceClass",
            id: "foo",
          },
          {
            type: "deviceClass",
            id: "baz",
          },
        ],
        selectedEditor: 0,
      },
    },
    4,
  );

  // @ts-expect-error Dealing with unknown types
  migrated.deviceClassEditors.foo.windowLayout = removeIdFields(
    // @ts-expect-error Dealing with unknown types
    migrated.deviceClassEditors.foo.windowLayout,
  );
  // @ts-expect-error Dealing with unknown types
  migrated.deviceClassEditors.baz.windowLayout = removeIdFields(
    // @ts-expect-error Dealing with unknown types
    migrated.deviceClassEditors.baz.windowLayout,
  );

  expect(migrated).toEqual({
    udrDatabase: {
      libraries: {
        "org.esta.intensity-color": {
          "1.0.0": {
            "@description": "esta_intensity-color_library",
            publishDate: "1970-01-01T00:00:00Z",
            author: "ESTA",
            parameterClasses: {},
          },
        },
      },
    },
    deviceClassEditors: {
      foo: {
        deviceClassId: "foo",
        basicData: { foo: "bar1" },
        libraries: { foo: "bar2" },
        deviceLibrary: { foo: "bar3" },
        parameters: { foo: "bar4" },
        structures: { foo: "bar5" },
        dmx: { foo: "bar6" },
        localizations: { foo: "bar7" },
        windowLayout: removeIdFields(getDefaultWindowLayout()),
      },
      baz: {
        deviceClassId: "foo",
        basicData: { foo: "baz1" },
        libraries: { foo: "baz2" },
        deviceLibrary: { foo: "baz3" },
        parameters: { foo: "baz4" },
        structures: { foo: "baz5" },
        dmx: { foo: "baz6" },
        localizations: { foo: "baz7" },
        windowLayout: removeIdFields(getDefaultWindowLayout()),
      },
    },
    appSettings: {
      darkMode: true,
    },
    openEditors: {
      editors: [
        {
          type: "deviceClass",
          id: "foo",
        },
        {
          type: "deviceClass",
          id: "baz",
        },
      ],
      selectedEditor: 0,
    },
  });
});

test("Migrates from state v5", () => {
  const migrated = migrateState(
    {
      udrDatabase: {
        foo: "bar",
      },
      deviceClassEditors: {
        foo: {
          deviceClassId: "foo",
          basicData: { foo: "bar1" },
          libraries: { foo: "bar2" },
          deviceLibrary: { foo: "bar3" },
          parameters: { foo: "bar4" },
          structures: { foo: "bar5" },
          dmx: { foo: "bar6" },
          localizations: { foo: "bar7" },
          windowLayout: { foo: "bar8" },
        },
        baz: {
          deviceClassId: "foo",
          basicData: { foo: "baz1" },
          libraries: { foo: "baz2" },
          deviceLibrary: { foo: "baz3" },
          parameters: { foo: "baz4" },
          structures: { foo: "baz5" },
          dmx: { foo: "baz6" },
          localizations: { foo: "baz7" },
          windowLayout: { foo: "baz8" },
        },
      },
      appSettings: {
        darkMode: true,
      },
      openEditors: {
        editors: [
          {
            type: "deviceClass",
            id: "foo",
          },
          {
            type: "deviceClass",
            id: "baz",
          },
        ],
        selectedEditor: 0,
      },
    },
    5,
  );

  // @ts-expect-error Dealing with unknown types
  migrated.deviceClassEditors.foo.windowLayout = removeIdFields(
    // @ts-expect-error Dealing with unknown types
    migrated.deviceClassEditors.foo.windowLayout,
  );
  // @ts-expect-error Dealing with unknown types
  migrated.deviceClassEditors.baz.windowLayout = removeIdFields(
    // @ts-expect-error Dealing with unknown types
    migrated.deviceClassEditors.baz.windowLayout,
  );

  expect(migrated).toEqual({
    udrDatabase: {
      foo: "bar",
    },
    deviceClassEditors: {
      foo: {
        deviceClassId: "foo",
        basicData: { foo: "bar1" },
        libraries: { foo: "bar2" },
        deviceLibrary: { foo: "bar3" },
        parameters: { foo: "bar4" },
        structures: { foo: "bar5" },
        dmx: { foo: "bar6" },
        localizations: { foo: "bar7" },
        windowLayout: removeIdFields(getDefaultWindowLayout()),
      },
      baz: {
        deviceClassId: "foo",
        basicData: { foo: "baz1" },
        libraries: { foo: "baz2" },
        deviceLibrary: { foo: "baz3" },
        parameters: { foo: "baz4" },
        structures: { foo: "baz5" },
        dmx: { foo: "baz6" },
        localizations: { foo: "baz7" },
        windowLayout: removeIdFields(getDefaultWindowLayout()),
      },
    },
    appSettings: {
      darkMode: true,
    },
    openEditors: {
      editors: [
        {
          type: "deviceClass",
          id: "foo",
        },
        {
          type: "deviceClass",
          id: "baz",
        },
      ],
      selectedEditor: 0,
    },
  });
});

// Helper to remove fields with the key 'id' from an object to an arbitrary depth
// The IDs in the flexlayout window layout are autogenerated so they will never compare equal
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function removeIdFields(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeIdFields);
  }
  if (obj && typeof obj === "object") {
    const result = { ...obj };
    delete result.id;
    for (const key in result) {
      result[key] = removeIdFields(result[key]);
    }
    return result;
  }
  return obj;
}
