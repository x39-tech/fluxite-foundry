import * as z from "zod";
import { AppStateSchema as AppStateSchemaV1 } from "./persistentState/v1/state";
import { AppStateSchema as AppStateSchemaV2 } from "./persistentState/v2/state";
import { AppStateSchema as AppStateSchemaV3 } from "./persistentState/v3/state";
import { migrateV1toV2 } from "./persistentState/v2/migrate";
import { migrateV2toV3 } from "./persistentState/v3/migrate";
import { migrateV3toV4 } from "./persistentState/v4/migrate";

export interface Migration {
  fromSchema: z.ZodSchema<unknown>;
  migrate: (state: unknown) => unknown;
  description: string;
}

export const MIGRATIONS: Migration[] = [
  {
    fromSchema: AppStateSchemaV1,
    migrate: migrateV1toV2 as (state: unknown) => unknown,
    description: "Convert darkMode boolean to theme enum",
  },
  {
    fromSchema: AppStateSchemaV2,
    migrate: migrateV2toV3 as (state: unknown) => unknown,
    description: `
- Collapse Parameter count, dynamicMinimum and dynamicMaximum into 'count' descriminated union.
- Key deviceClassEditors by EntityId instead of string.
- DmxMappingRange: chunkStart/chunkEnd moved into chunkValues discriminated union, where we also add support for sequences.
- DmxMappingGroup: add triggers array.
`,
  },
  {
    fromSchema: AppStateSchemaV3,
    migrate: migrateV3toV4 as (state: unknown) => unknown,
    description: `
- ParameterReference references parameters by EntityId instead of by CodexId.
- DmxTrigger.command is an EntityId instead of a CodexId.
- enumExclusions, argEnumExclusions, returnEnumExclusions and trigger condition keys use LocalOrImportedIds (EntityId for local classes, CodexId for imported).
`,
  },
];
