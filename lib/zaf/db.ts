import postgres, { type Sql } from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
let client: Sql<{}> | null = null;
let schemaPromise: Promise<boolean> | null = null;

export function isZafDatabaseConfigured() {
  return Boolean(DATABASE_URL);
}

export function getZafDb(): Sql<{}> | null {
  if (!DATABASE_URL) return null;
  if (!client) {
    client = postgres(DATABASE_URL, {
      max: 2,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return client;
}

const MIGRATIONS = [
  {
    id: "0001_core_and_pi_foundation",
    statements: [
      `CREATE TABLE IF NOT EXISTS zaf_schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
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
       ALTER COLUMN daily_transactions TYPE DOUBLE PRECISION
       USING daily_transactions::double precision`,
      `ALTER TABLE zaf_observation_snapshots
       ALTER COLUMN daily_operations TYPE DOUBLE PRECISION
       USING daily_operations::double precision`,
      `CREATE INDEX IF NOT EXISTS zaf_observation_snapshots_generated_at_idx
       ON zaf_observation_snapshots (generated_at DESC)`,
      `CREATE TABLE IF NOT EXISTS zaf_users (
        id BIGSERIAL PRIMARY KEY,
        provider TEXT NOT NULL CHECK (provider IN ('pi')),
        provider_uid TEXT NOT NULL,
        username TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (provider, provider_uid)
      )`,
      `CREATE INDEX IF NOT EXISTS zaf_users_provider_uid_idx
       ON zaf_users (provider, provider_uid)`,
      `CREATE TABLE IF NOT EXISTS zaf_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES zaf_users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS zaf_sessions_user_expires_idx
       ON zaf_sessions (user_id, expires_at DESC)`,
      `CREATE TABLE IF NOT EXISTS zaf_wallet_links (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES zaf_users(id) ON DELETE CASCADE,
        network_scope TEXT NOT NULL CHECK (network_scope IN ('mainnet', 'testnet')),
        wallet_address TEXT NOT NULL,
        source TEXT NOT NULL,
        verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, network_scope, wallet_address)
      )`,
      `CREATE INDEX IF NOT EXISTS zaf_wallet_links_user_idx
       ON zaf_wallet_links (user_id, verified_at DESC)`,
      `CREATE TABLE IF NOT EXISTS zaf_payments (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES zaf_users(id) ON DELETE RESTRICT,
        payment_identifier TEXT NOT NULL UNIQUE,
        amount NUMERIC NOT NULL,
        memo TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        network TEXT,
        status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'submitted', 'completed', 'cancelled', 'failed')),
        txid TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        approved_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS zaf_payments_user_created_idx
       ON zaf_payments (user_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS zaf_payment_events (
        id BIGSERIAL PRIMARY KEY,
        payment_id BIGINT NOT NULL REFERENCES zaf_payments(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        txid TEXT,
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS zaf_payment_events_payment_created_idx
       ON zaf_payment_events (payment_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS zaf_entitlements (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES zaf_users(id) ON DELETE CASCADE,
        feature_key TEXT NOT NULL,
        source_payment_id BIGINT REFERENCES zaf_payments(id) ON DELETE SET NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
        granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        UNIQUE (user_id, feature_key)
      `),
      `CREATE INDEX IF NOT EXISTS zaf_entitlements_user_idx
       ON zaf_entitlements (user_id, status)`,
      `CREATE TABLE IF NOT EXISTS zaf_login_events (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES zaf_users(id) ON DELETE SET NULL,
        provider TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        failure_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS zaf_login_events_created_idx
       ON zaf_login_events (created_at DESC)`,
      `INSERT INTO zaf_schema_migrations (id)
       VALUES ('0001_core_and_pi_foundation')
       ON CONFLICT (id) DO NOTHING`,
    ],
  },
];

export async function ensureZafSchema() {
  if (!getZafDb()) return false;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = getZafDb();
      if (!sql) return false;
      try {
        await sql`SELECT pg_advisory_lock(748316251)`;
        try {
          await sql`CREATE TABLE IF NOT EXISTS zaf_schema_migrations (
            id TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )`;
          for (const migration of MIGRATIONS) {
            const existing = await sql`
              SELECT 1 FROM zaf_schema_migrations WHERE id = ${migration.id} LIMIT 1
            `;
            if (existing.length) continue;
            await sql.begin(async (tx) => {
              for (const statement of migration.statements.slice(0, -1)) {
                await tx.unsafe(statement);
              }
              await tx`
                INSERT INTO zaf_schema_migrations (id)
                VALUES (${migration.id})
                ON CONFLICT (id) DO NOTHING
              `;
            });
          }
          return true;
        } finally {
          await sql`SELECT pg_advisory_unlock(748316251)`;
        }
      } catch (error) {
        schemaPromise = null;
        console.error("[ZAF-TECH] Schema migration failed", error);
        return false;
      }
    })();
  }
  return schemaPromise;
}
