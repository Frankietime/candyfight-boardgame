import { Pool } from "pg";

/**
 * Lazy Postgres pool for the mods store (Neon free tier).
 * The server must boot and serve matches without a DATABASE_URL — in that
 * case getModsPool() returns null and the /mods routes answer 503.
 */
let pool: Pool | null = null;
let tableReady: Promise<void> | null = null;

export const getModsPool = (): Pool | null => {
    if (pool) return pool;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) return null;
    // Neon requires TLS (`sslmode=require` in the connection string); its
    // certificates chain to public CAs, so default verification applies.
    pool = new Pool({ connectionString });
    return pool;
};

const CREATE_MODS_TABLE = `
CREATE TABLE IF NOT EXISTS mods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`;

/**
 * Idempotent migration, cached after the first success. A failure clears the
 * cache so the next request retries — otherwise one bad connection at boot
 * would 500 every /mods request forever, even after the DB recovers.
 */
export const ensureModsTable = (activePool: Pool): Promise<void> => {
    if (!tableReady) {
        tableReady = activePool.query(CREATE_MODS_TABLE).then(
            () => undefined,
            (error) => {
                tableReady = null;
                throw error;
            }
        );
    }
    return tableReady as Promise<void>;
};
