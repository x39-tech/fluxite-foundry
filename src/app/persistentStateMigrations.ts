import * as z from "zod";
import { AppStateSchema as AppStateSchemaV1 } from "./persistentState/v1/state";
import { migrateV1toV2 } from "./persistentState/v2/migrate";

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
];
