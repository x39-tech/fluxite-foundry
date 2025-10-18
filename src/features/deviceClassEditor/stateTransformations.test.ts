import { DataType, E173Document, UnitName } from "e173";
import {
  getEmptyCodexDatabase,
  loadLibrariesFromDocument,
} from "codex/codexDatabase";
import { lookupParameterClass } from "./stateTransformations";
import { beforeEach, describe, expect, test } from "vitest";
import { CodexId } from "app/persistentState";

const testDoc: E173Document = {
  e173doc: {
    libraries: {
      "org.test.lib.test_lib": {
        "1.0.0": {
          "@description": "Test Description",
          publishDate: "foo",
          author: "bar",
          parameterClasses: {
            parameter1: {
              "@name": "parameter_1",
              "@description": "parameter_1_desc",
              dataType: DataType.Number,
              unit: {
                name: UnitName.Hertz,
              },
            },
            "category/parameter2": {
              "@name": "parameter_2",
              dataType: DataType.Boolean,
            },
          },
          structureClasses: {
            structure1: {
              "@name": "structure_1",
              "@description": "structure_1_desc",
            },
          },
          serializerClasses: {},
          resourceClasses: {},
          localizations: {
            "en-US": {
              strings: {
                parameter_1: "Parameter One",
                parameter_1_desc: "The first parameter",
              },
            },
          },
        },
      },
    },
  },
  $schema:
    "https://gitlab.com/esta-cpwg/e173/-/raw/main/schemas/draft-2024-1/udr-document.json",
};

describe("class lookup", () => {
  let database = getEmptyCodexDatabase();

  beforeEach(() => {
    database = getEmptyCodexDatabase();
    expect(loadLibrariesFromDocument(testDoc, database)).toBe(true);
  });

  test("parameter class lookup is successful", () => {
    const expectedItem =
      testDoc.e173doc.libraries!["org.test.lib.test_lib"]["1.0.0"]
        .parameterClasses!.parameter1;

    expect(
      lookupParameterClass(
        database,
        CodexId("parameter1"),
        "org.test.lib.test_lib",
        "1.0.0",
        "en-US",
      ),
    ).toStrictEqual({
      codexId: "parameter1",
      libraryId: "org.test.lib.test_lib",
      libraryVersion: "1.0.0",
      name: {
        desiredLocale: "en-US",
        locale: "en-US",
        value: "Parameter One",
      },
      description: {
        desiredLocale: "en-US",
        locale: "en-US",
        value: "The first parameter",
      },
      dataType: expectedItem.dataType,
      unit: expectedItem.unit,
      choices: [],
    });
  });

  test("parameter class lookup is successful with an identifier containing slashes", () => {
    const itemClass = lookupParameterClass(
      database,
      CodexId("category/parameter2"),
      "org.test.lib.test_lib",
      "1.0.0",
      "en-US",
    );
    expect(itemClass).toBeTruthy();
    expect(itemClass!.codexId).toBe("category/parameter2");
  });

  test("parameter class lookup returns undefined when given a parameter ID that doesn't exist", () => {
    expect(
      lookupParameterClass(
        database,
        CodexId("undefined-parameter"),
        "org.test.lib.test_lib",
        "1.0.0",
        "en-US",
      ),
    ).toBe(undefined);
  });
});
