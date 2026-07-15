import type Router from "@koa/router";
import type { DefaultState } from "koa";
import { koaBody } from "koa-body";
import { validateModDefinition } from "@candyfight/shared/mods";
import { ensureModsTable, getModsPool } from "./db";
import type { Pool } from "pg";
import type { Context } from "koa";

/**
 * REST API for mod cartridges. All routes 503 when no DATABASE_URL is
 * configured so local dev without a DB keeps working.
 *
 * boardgame.io only applies body parsing to its own lobby routes, so POST/PUT
 * here carry their own koaBody() middleware.
 */

const METADATA_COLUMNS = "id, name, description, updated_at";

/** Resolve the pool (503 into ctx when unavailable). */
const requirePool = async (ctx: Context): Promise<Pool | null> => {
    const pool = getModsPool();
    if (!pool) {
        ctx.status = 503;
        ctx.body = { error: "mods storage not configured (set DATABASE_URL)" };
        return null;
    }
    await ensureModsTable(pool);
    return pool;
};

/** Validate the request's mod payload; sets 400 and returns null on failure. */
const requireValidPayload = (ctx: Context): { name: string; description: string; payload: unknown } | null => {
    const body = (ctx.request as { body?: Record<string, unknown> }).body ?? {};
    const result = validateModDefinition(body.payload);
    if (!result.ok) {
        ctx.status = 400;
        ctx.body = { error: "invalid mod payload", details: result.errors };
        return null;
    }
    return {
        name: result.mod.name,
        description: result.mod.description ?? "",
        payload: body.payload,
    };
};

// Accepts boardgame.io's server.router (Router<any, AppCtx>) — the mods
// routes only use base koa context features.
export const registerModRoutes = <StateT = DefaultState, ContextT = unknown>(
    router: Router<StateT, ContextT>
): void => {
    const parseBody = koaBody({ json: true });

    router.get("/mods", async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const { rows } = await pool.query(
            `SELECT ${METADATA_COLUMNS} FROM mods ORDER BY updated_at DESC`
        );
        ctx.body = { mods: rows };
    });

    router.get("/mods/:id", async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const { rows } = await pool.query(
            `SELECT ${METADATA_COLUMNS}, payload FROM mods WHERE id = $1`,
            [ctx.params.id]
        );
        if (rows.length === 0) {
            ctx.status = 404;
            ctx.body = { error: "mod not found" };
            return;
        }
        ctx.body = rows[0];
    });

    router.post("/mods", parseBody, async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const valid = requireValidPayload(ctx);
        if (!valid) return;
        const { rows } = await pool.query(
            `INSERT INTO mods (name, description, payload) VALUES ($1, $2, $3)
             RETURNING ${METADATA_COLUMNS}, payload`,
            [valid.name, valid.description, JSON.stringify(valid.payload)]
        );
        ctx.status = 201;
        ctx.body = rows[0];
    });

    router.put("/mods/:id", parseBody, async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const valid = requireValidPayload(ctx);
        if (!valid) return;
        const { rows } = await pool.query(
            `UPDATE mods SET name = $2, description = $3, payload = $4, updated_at = now()
             WHERE id = $1 RETURNING ${METADATA_COLUMNS}, payload`,
            [ctx.params.id, valid.name, valid.description, JSON.stringify(valid.payload)]
        );
        if (rows.length === 0) {
            ctx.status = 404;
            ctx.body = { error: "mod not found" };
            return;
        }
        ctx.body = rows[0];
    });

    router.delete("/mods/:id", async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const { rowCount } = await pool.query("DELETE FROM mods WHERE id = $1", [ctx.params.id]);
        if (rowCount === 0) {
            ctx.status = 404;
            ctx.body = { error: "mod not found" };
            return;
        }
        ctx.status = 204;
    });
};
