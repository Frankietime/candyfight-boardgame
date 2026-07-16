import type { Pool } from "pg";

/**
 * Deck sets share the SAME Postgres connection as mods (one DATABASE_URL,
 * one pool) — see ../mods/db.ts for the lazy pool / 503-when-unconfigured
 * behavior. This file only owns the deck_sets table's migration.
 */
export { getModsPool } from "../mods/db";

const CREATE_DECK_SETS_TABLE = `
CREATE TABLE IF NOT EXISTS deck_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`;

let tableReady: Promise<void> | null = null;

/** Idempotent migration, cached after the first success (see mods/db.ts for why). */
export const ensureDeckSetsTable = (activePool: Pool): Promise<void> => {
    if (!tableReady) {
        tableReady = activePool.query(CREATE_DECK_SETS_TABLE).then(
            () => undefined,
            (error) => {
                tableReady = null;
                throw error;
            }
        );
    }
    return tableReady as Promise<void>;
};
