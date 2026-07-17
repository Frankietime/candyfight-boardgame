import type Router from "@koa/router";
import type { DefaultState } from "koa";
import { koaBody } from "koa-body";
import { validateSignetSetDefinition } from "@candyfight/shared/mods";
import { ensureSignetSetsTable, getModsPool } from "./db";
import type { Pool } from "pg";
import type { Context } from "koa";

/**
 * REST API for reusable signet sets (a character roster, saved independently
 * of any mod). Mirrors server/deckSets/routes.ts exactly — same lazy-pool/503,
 * same koa-body-per-route, same shape — signet sets are a sibling resource,
 * not a variant of mods or deck sets.
 */

const METADATA_COLUMNS = "id, name, description, updated_at";

const requirePool = async (ctx: Context): Promise<Pool | null> => {
    const pool = getModsPool();
    if (!pool) {
        ctx.status = 503;
        ctx.body = { error: "signet sets storage not configured (set DATABASE_URL)" };
        return null;
    }
    await ensureSignetSetsTable(pool);
    return pool;
};

const requireValidPayload = (ctx: Context): { name: string; description: string; payload: unknown } | null => {
    const body = (ctx.request as { body?: Record<string, unknown> }).body ?? {};
    const result = validateSignetSetDefinition(body.payload);
    if (!result.ok) {
        ctx.status = 400;
        ctx.body = { error: "invalid signet set payload", details: result.errors };
        return null;
    }
    return {
        name: result.signetSet.name,
        description: result.signetSet.description ?? "",
        payload: body.payload,
    };
};

export const registerSignetSetRoutes = <StateT = DefaultState, ContextT = unknown>(
    router: Router<StateT, ContextT>
): void => {
    const parseBody = koaBody({ json: true });

    router.get("/signetsets", async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const { rows } = await pool.query(
            `SELECT ${METADATA_COLUMNS} FROM signet_sets ORDER BY updated_at DESC`
        );
        ctx.body = { signetSets: rows };
    });

    router.get("/signetsets/:id", async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const { rows } = await pool.query(
            `SELECT ${METADATA_COLUMNS}, payload FROM signet_sets WHERE id = $1`,
            [ctx.params.id]
        );
        if (rows.length === 0) {
            ctx.status = 404;
            ctx.body = { error: "signet set not found" };
            return;
        }
        ctx.body = rows[0];
    });

    router.post("/signetsets", parseBody, async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const valid = requireValidPayload(ctx);
        if (!valid) return;
        const { rows } = await pool.query(
            `INSERT INTO signet_sets (name, description, payload) VALUES ($1, $2, $3)
             RETURNING ${METADATA_COLUMNS}, payload`,
            [valid.name, valid.description, JSON.stringify(valid.payload)]
        );
        ctx.status = 201;
        ctx.body = rows[0];
    });

    router.put("/signetsets/:id", parseBody, async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const valid = requireValidPayload(ctx);
        if (!valid) return;
        const { rows } = await pool.query(
            `UPDATE signet_sets SET name = $2, description = $3, payload = $4, updated_at = now()
             WHERE id = $1 RETURNING ${METADATA_COLUMNS}, payload`,
            [ctx.params.id, valid.name, valid.description, JSON.stringify(valid.payload)]
        );
        if (rows.length === 0) {
            ctx.status = 404;
            ctx.body = { error: "signet set not found" };
            return;
        }
        ctx.body = rows[0];
    });

    router.delete("/signetsets/:id", async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const { rowCount } = await pool.query("DELETE FROM signet_sets WHERE id = $1", [ctx.params.id]);
        if (rowCount === 0) {
            ctx.status = 404;
            ctx.body = { error: "signet set not found" };
            return;
        }
        ctx.status = 204;
    });
};
