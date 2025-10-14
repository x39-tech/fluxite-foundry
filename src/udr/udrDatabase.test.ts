import { DataType, E173Document, UnitName } from "e173";
import {
  getEmptyUdrDatabase,
  loadLibrariesFromDocument,
  lookupParameterClass,
} from "./udrDatabase";
import { beforeEach, describe, expect, test } from "vitest";

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
          localizations: {},
        },
      },
    },
  },
  $schema:
    "https://gitlab.com/esta-cpwg/e173/-/raw/main/schemas/draft-2024-1/udr-document.json",
};

describe("class lookup", () => {
  let database = getEmptyUdrDatabase();

  beforeEach(() => {
    database = getEmptyUdrDatabase();
    expect(loadLibrariesFromDocument(testDoc, database)).toBe(true);
  });

  test("parameter class lookup is successful", () => {
    const expectedItem =
      testDoc.e173doc.libraries!["org.test.lib.test_lib"]["1.0.0"]
        .parameterClasses!.parameter1;

    expect(
      lookupParameterClass(
        database,
        "org.test.lib.test_lib",
        "1.0.0",
        "parameter1",
      ),
    ).toStrictEqual({
      id: "parameter1",
      libraryId: "org.test.lib.test_lib",
      libraryVersion: "1.0.0",
      name: expectedItem["@name"],
      description: expectedItem["@description"],
      dataType: expectedItem.dataType,
      unit: expectedItem.unit,
    });
  });

  test("parameter class lookup is successful with an identifier containing slashes", () => {
    const itemClass = lookupParameterClass(
      database,
      "org.test.lib.test_lib",
      "1.0.0",
      "category/parameter2",
    );
    expect(itemClass).toBeTruthy();
    expect(itemClass!.id).toBe("category/parameter2");
  });

  test("parameter class lookup returns undefined when given a parameter ID that doesn't exist", () => {
    expect(
      lookupParameterClass(
        database,
        "org.test.lib.test_lib",
        "1.0.0",
        "undefined-parameter",
      ),
    ).toBe(undefined);
  });
});
