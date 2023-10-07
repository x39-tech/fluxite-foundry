import {
  DataType,
  E173UDRDocuments,
  Unit,
} from "generated/draft-2023-1/udr-document";
import {
  getEmptyUdrDatabase,
  loadLibrariesFromDocument,
  lookupParameterClass,
} from "./udrDatabase";
import { beforeEach, describe, expect, test } from "vitest";

const testDoc: E173UDRDocuments = {
  e173doc: {
    libraries: {
      test_lib: {
        "@description": "Test Description",
        publishDate: "foo",
        author: "bar",
        parameterClasses: {
          parameter1: {
            "@name": "parameter_1",
            "@description": "parameter_1_desc",
            dataType: DataType.NUMBER,
            unit: Unit.HERTZ,
          },
          "category/parameter2": {
            "@name": "parameter_2",
            dataType: DataType.BOOLEAN,
          },
        },
        structureClasses: {
          structure1: {
            "@name": "structure_1",
            "@description": "structure_1_desc",
          },
        },
      },
    },
  },
  $schema:
    "https://gitlab.com/esta-cpwg/e173/-/raw/main/schemas/draft-2023-1/udr-document.json",
};

describe("class lookup", () => {
  let database = getEmptyUdrDatabase();

  beforeEach(() => {
    database = getEmptyUdrDatabase();
    expect(loadLibrariesFromDocument(testDoc, database)).toBe(true);
  });

  test("parameter class lookup is successful", () => {
    const expectedItem =
      testDoc.e173doc.libraries!.test_lib.parameterClasses!.parameter1;

    expect(lookupParameterClass(database, "test_lib/parameter1")).toStrictEqual(
      {
        id: "parameter1",
        libraryId: "test_lib",
        ...expectedItem,
      },
    );
  });

  test("parameter class lookup is successful with an identifier containing slashes", () => {
    const itemClass = lookupParameterClass(
      database,
      "test_lib/category/parameter2",
    );
    expect(itemClass).toBeTruthy();
    expect(itemClass!.id).toBe("category/parameter2");
  });

  test("parameter class lookup returns undefined when given a parameter ID that doesn't exist", () => {
    expect(lookupParameterClass(database, "test_lib/undefined-parameter")).toBe(
      undefined,
    );
  });

  test("parameter class lookup returns undefined when the category identifier is missing", () => {
    expect(lookupParameterClass(database, "test_lib")).toBe(undefined);
  });
});
