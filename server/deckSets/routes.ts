import type Router from "@koa/router";
import type { DefaultState } from "koa";
import { koaBody } from "koa-body";
import { validateDeckSetDefinition } from "@candyfight/shared/mods";
import { ensureDeckSetsTable, getModsPool } from "./db";
import type { Pool } from "pg";
import type { Context } from "koa";

/**
 * REST API for reusable deck sets (mazo base + market tiers, saved
 * independently of any mod). Mirrors server/mods/routes.ts exactly — same
 * lazy-pool/503, same koa-body-per-route, same shape — deck sets are a
 * sibling resource, not a variant of mods.
 */

const METADATA_COLUMNS = "id, name, description, updated_at";

const requirePool = async (ctx: Context): Promise<Pool | null> => {
    const pool = getModsPool();
    if (!pool) {
        ctx.status = 503;
        ctx.body = { error: "deck sets storage not configured (set DATABASE_URL)" };
        return null;
    }
    await ensureDeckSetsTable(pool);
    return pool;
};

const requireValidPayload = (ctx: Context): { name: string; description: string; payload: unknown } | null => {
    const body = (ctx.request as { body?: Record<string, unknown> }).body ?? {};
    const result = validateDeckSetDefinition(body.payload);
    if (!result.ok) {
        ctx.status = 400;
        ctx.body = { error: "invalid deck set payload", details: result.errors };
        return null;
    }
    return {
        name: result.deckSet.name,
        description: result.deckSet.description ?? "",
        payload: body.payload,
    };
};

export const registerDeckSetRoutes = <StateT = DefaultState, ContextT = unknown>(
    router: Router<StateT, ContextT>
): void => {
    const parseBody = koaBody({ json: true });

    router.get("/decksets", async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const { rows } = await pool.query(
            `SELECT ${METADATA_COLUMNS} FROM deck_sets ORDER BY updated_at DESC`
        );
        ctx.body = { deckSets: rows };
    });

    router.get("/decksets/:id", async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const { rows } = await pool.query(
            `SELECT ${METADATA_COLUMNS}, payload FROM deck_sets WHERE id = $1`,
            [ctx.params.id]
        );
        if (rows.length === 0) {
            ctx.status = 404;
            ctx.body = { error: "deck set not found" };
            return;
        }
        ctx.body = rows[0];
    });

    router.post("/decksets", parseBody, async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const valid = requireValidPayload(ctx);
        if (!valid) return;
        const { rows } = await pool.query(
            `INSERT INTO deck_sets (name, description, payload) VALUES ($1, $2, $3)
             RETURNING ${METADATA_COLUMNS}, payload`,
            [valid.name, valid.description, JSON.stringify(valid.payload)]
        );
        ctx.status = 201;
        ctx.body = rows[0];
    });

    router.put("/decksets/:id", parseBody, async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const valid = requireValidPayload(ctx);
        if (!valid) return;
        const { rows } = await pool.query(
            `UPDATE deck_sets SET name = $2, description = $3, payload = $4, updated_at = now()
             WHERE id = $1 RETURNING ${METADATA_COLUMNS}, payload`,
            [ctx.params.id, valid.name, valid.description, JSON.stringify(valid.payload)]
        );
        if (rows.length === 0) {
            ctx.status = 404;
            ctx.body = { error: "deck set not found" };
            return;
        }
        ctx.body = rows[0];
    });

    router.delete("/decksets/:id", async (ctx: Context) => {
        const pool = await requirePool(ctx);
        if (!pool) return;
        const { rowCount } = await pool.query("DELETE FROM deck_sets WHERE id = $1", [ctx.params.id]);
        if (rowCount === 0) {
            ctx.status = 404;
            ctx.body = { error: "deck set not found" };
            return;
        }
        ctx.status = 204;
    });
};
