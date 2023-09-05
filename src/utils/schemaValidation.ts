import Ajv, { ErrorObject } from "ajv/dist/2019";
import addFormats from "ajv-formats";

export type SchemaValidateResult = true | string;

export function validateWithSchema(
  schema: object,
  data: object,
): SchemaValidateResult {
  const ajv = new Ajv();
  addFormats(ajv);
  const success = ajv.validate(schema, data);

  return success ? true : getHumanReadableErrors(ajv.errors ?? undefined);
}

function getHumanReadableErrors(errors?: ErrorObject[]): string {
  if (errors === undefined) {
    return "No errors found";
  }

  return errors
    .map(
      (error) =>
        `Path '${error.instancePath || "/"}': ${error.message} (${
          error.keyword
        })`,
    )
    .join("\n");
}
