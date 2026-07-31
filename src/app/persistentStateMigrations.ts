import * as z from "zod";
import * as V1 from "./persistentState/v1/state";
import * as V2 from "./persistentState/v2/state";
import * as V3 from "./persistentState/v3/state";
import * as V4 from "./persistentState/v4/state";
import { migrateV1toV2 } from "./persistentState/v2/migrate";
import { migrateV2toV3 } from "./persistentState/v3/migrate";
import { migrateV3toV4 } from "./persistentState/v4/migrate";

/**
 * What every `persistentState/vN/state.ts` module exports that the chain needs.
 */
export interface VersionModule<State> {
  VERSION: number;
  AppStateSchema: z.ZodType<State>;
}

/**
 * One step of the migration chain: how to turn a state written at `fromVersion`
 * into one written at `toVersion`.
 */
export interface Migration {
  fromVersion: number;
  toVersion: number;
  fromSchema: z.ZodType;
  toSchema: z.ZodType;
  migrate: (state: unknown) => unknown;
  description: string;
}

/**
 * Use of `NoInfer` ensures that the `migrate` function is the source of truth
 * for the migration step, and the `from` and `to` modules are checked (at
 * compile time) to make sure they match.
 */
function defineMigration<From, To>(spec: {
  from: VersionModule<NoInfer<From>>;
  to: VersionModule<NoInfer<To>>;
  migrate: (state: From) => To;
  description: string;
}): Migration {
  return {
    fromVersion: spec.from.VERSION,
    toVersion: spec.to.VERSION,
    fromSchema: spec.from.AppStateSchema,
    toSchema: spec.to.AppStateSchema,
    migrate: spec.migrate as (state: unknown) => unknown,
    description: spec.description,
  };
}

/**
 * The migration chain, in ascending version order.
 *
 * Look entries up with {@link getMigration} rather than by index; the index
 * happening to be `fromVersion - 1` is a coincidence of starting at version 1.
 */
export const MIGRATIONS: readonly Migration[] = [
  defineMigration({
    from: V1,
    to: V2,
    migrate: migrateV1toV2,
    description: "Convert darkMode boolean to theme enum",
  }),
  defineMigration({
    from: V2,
    to: V3,
    migrate: migrateV2toV3,
    description: `
- Collapse Parameter count, dynamicMinimum and dynamicMaximum into 'count' descriminated union.
- Key deviceClassEditors by EntityId instead of string.
- DmxMappingRange: chunkStart/chunkEnd moved into chunkValues discriminated union, where we also add support for sequences.
- DmxMappingGroup: add triggers array.
`,
  }),
  defineMigration({
    from: V3,
    to: V4,
    migrate: migrateV3toV4,
    description: `
- ParameterReference references parameters by EntityId instead of by CodexId.
- DmxTrigger.command is an EntityId instead of a CodexId.
- enumExclusions, argEnumExclusions, returnEnumExclusions and trigger condition keys use LocalOrImportedIds (EntityId for local classes, CodexId for imported).
`,
  }),
];

/**
 * The most recent version in the migration chain.
 */
export const CHAIN_END_VERSION = MIGRATIONS[MIGRATIONS.length - 1].toVersion;

const MIGRATIONS_BY_FROM_VERSION = new Map(
  MIGRATIONS.map((migration) => [migration.fromVersion, migration]),
);

/** The migration that takes a state at `fromVersion` to the next version. */
export function getMigration(fromVersion: number): Migration | undefined {
  return MIGRATIONS_BY_FROM_VERSION.get(fromVersion);
}

/**
 * The schema a state at `version` is expected to match, for any version the
 * chain covers.
 */
export function getSchemaForVersion(version: number): z.ZodType | undefined {
  const migration = getMigration(version);
  if (migration) {
    return migration.fromSchema;
  }

  const last = MIGRATIONS[MIGRATIONS.length - 1];
  return last?.toVersion === version ? last.toSchema : undefined;
}

/**
 * A gap or a repeat in the chain would leave a state version unreachable, and
 * the runner would silently fall back to default state for it. Checked the
 * moment the module loads rather than the first time someone opens a file
 * saved at the version that fell through the gap.
 *
 * @throws if the chain does not step one version at a time, starting at v1.
 */
export function assertChainIsContiguous(
  migrations: readonly Migration[],
): void {
  migrations.forEach((migration, index) => {
    const expectedFrom = index + 1;
    if (
      migration.fromVersion !== expectedFrom ||
      migration.toVersion !== expectedFrom + 1
    ) {
      throw new Error(
        `Migration chain is not contiguous: expected v${expectedFrom} to v${expectedFrom + 1} at index ${index}, found v${migration.fromVersion} to v${migration.toVersion}.`,
      );
    }
  });
}

assertChainIsContiguous(MIGRATIONS);
