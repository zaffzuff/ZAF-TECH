import postgres, { type Sql } from "postgres";

const MIGRATION_LOCK_ID = 748316251;

let sqlClient: Sql<{}> | null = null;
let schemaPromise: Promise<boolean> | null = null;

type Migration = {
  id: string;
  statements: string[];
};

const MIGRATIONS: Migration[] = [
  {
    id: "0001_core_history",
    statements: [
      `CREATE TABLE IF NOT EXISTS zaf_app_checks (
        id BIGSERIAL PRIMARY KEY,
        app_name TEXT NOT NULL,
        url TEXT NOT NULL,
        status INTEGER,
        ok BOOLEAN NOT NULL,
        reachable BOOLEAN NOT NULL,
        response_time_ms INTEGER NOT NULL,
        https BOOLEAN NOT NULL,
        redirect BOOLEAN NOT NULL,
        checked_at TIMESTAMPTZ NOT NULL,
        error TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS zaf_app_checks_url_checked_at_idx
        ON zaf_app_checks (url, checked_at DESC)`,
      `CREATE TABLE IF NOT EXISTS zaf_defi_snapshots (
        id BIGSERIAL PRIMARY KEY,
        generated_at TIMESTAMPTZ NOT NULL,
        pools INTEGER NOT NULL,
        trades INTEGER NOT NULL,
        pairs INTEGER NOT NULL,
        distinct_assets INTEGER NOT NULL,
        pool_ids JSONB NOT NULL,
        pair_keys JSONB NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS zaf_defi_snapshots_generated_at_idx
        ON zaf_defi_snapshots (generated_at DESC)`,
      `CREATE TABLE IF NOT EXISTS zaf_ecosystem_snapshots (
        id BIGSERIAL PRIMARY KEY,
        generated_at TIMESTAMPTZ NOT NULL,
        source_available BOOLEAN NOT NULL,
        observed_app_count INTEGER NULL,
        payload JSONB NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS zaf_ecosystem_snapshots_generated_at_idx
        ON zaf_ecosystem_snapshots (generated_at DESC)`,
      `CREATE TABLE IF NOT EXISTS zaf_observation_snapshots (
        id BIGSERIAL PRIMARY KEY,
        bucket_start TIMESTAMPTZ NOT NULL UNIQUE,
        generated_at TIMESTAMPTZ NOT NULL,
        network_scope TEXT NOT NULL DEFAULT 'mainnet' CHECK (network_scope IN ('mainnet', 'testnet', 'unknown')),
        freshness_state TEXT NOT NULL,
        confidence_score NUMERIC NULL,
        network_ledger TEXT NULL,
        protocol_version INTEGER NULL,
        observed_transactions INTEGER NULL,
        observed_operations INTEGER NULL,
        daily_transactions DOUBLE PRECISION NULL,
        daily_operations DOUBLE PRECISION NULL,
        observed_apps INTEGER NULL,
        available_sources INTEGER NOT NULL,
        total_sources INTEGER NOT NULL
      )`,
      `ALTER TABLE zaf_observation_snapshots
        ADD COLUMN IF NOT EXISTS network_scope TEXT NOT NULL DEFAULT 'mainnet'`,
      `ALTER TABLE zaf_observation_snapshots
        ALTER COLUMN daily_transactions TYPE DOUBLE PRECISION USING daily_transactions::double precision,
        ALTER COLUMN daily_operations TYPE DOUBLE PRECISION USING daily_operations::double precision`,
      `CREATE INDEX IF NOT EXISTS zaf_observation_snapshots_generated_at_idx
        ON zaf_observation_snapshots (generated_at DESC)`,
    ],
  },
];

export function isZafDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getZafDb(): Sql<{}> | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  if (!sqlClient) {
    sqlClient = postgres(databaseUrl, {
      max: 4,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return sqlClient;
}

export async function ensureZafSchema() {
  const sql = getZafDb();
  if (!sql) return false;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        await sql.begin(async (tx) => {
          await tx`CREATE TABLE IF NOT EXISTS zaf_schema_migrations (
            id TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )`;
          await tx`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_ID})`;

          for (const migration of MIGRATIONS) {
            const applied = await tx`
              SELECT 1
              FROM zaf_schema_migrations
              WHERE id = ${migration.id}
              LIMIT 1
            `;
            if (applied.length) continue;

            for (const statement of migration.statements) {
              await tx.unsafe(statement);
            }

            await tx`
              INSERT INTO zaf_schema_migrations (id)
              VALUES (${migration.id})
            `;
          }
        });

        return true;
      } catch (error) {
        schemaPromise = null;
        console.error("[ZAF-TECH] Schema migration failed", error);
        return false;
      }
    })();
  }
  return schemaPromise;
}
