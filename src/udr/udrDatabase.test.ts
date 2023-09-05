import {
  DataType,
  E173UDRDocuments,
  Unit,
} from "generated/draft-2023-1/udr-document";
import { loadLibrariesFromDocument, lookupParameterClass } from "./udrDatabase";
import { beforeEach, describe, expect, test } from "vitest";

const testDoc: E173UDRDocuments = {
  e173: {
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
  beforeEach(() => {
    expect(loadLibrariesFromDocument(testDoc)).toBe(true);
  });

  test("parameter class lookup is successful", () => {
    const expectedItem =
      testDoc.e173.libraries!.test_lib.parameterClasses!.parameter1;

    expect(lookupParameterClass("test_lib/parameter1")).toStrictEqual({
      id: "parameter1",
      libraryId: "test_lib",
      ...expectedItem,
    });
  });

  test("parameter class lookup is successful with an identifier containing slashes", () => {
    const itemClass = lookupParameterClass(
      "org.esta.lib.gobo.1/gobo/select/index",
    );
    expect(itemClass).toBeTruthy();
    expect(itemClass!.identifier).toBe("index");
  });
});

// describe("lookupParameterClass", () => {
//   it("returns undefined when a parameter ID doesn't exist within a valid category", () => {
//     expect(
//       lookupParameterClass("org.esta.lib.intensity-color.1/intensity/foo")
//     ).toBe(undefined);
//   });
//
//   it("returns undefined when the parameter identifier is missing", () => {
//     expect(
//       lookupParameterClass("org.esta.lib.intensity-color.1/intensity")
//     ).toBe(undefined);
//   });
//
//   it("returns undefined when the category identifier is missing", () => {
//     expect(lookupParameterClass("org.esta.lib.intensity-color.1")).toBe(
//       undefined
//     );
//   });
//
//   it("returns undefined when given an arbitrary string", () => {
//     expect(lookupParameterClass("foo")).toBe(undefined);
//   });
// });
