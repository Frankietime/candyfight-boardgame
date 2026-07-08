import { describe, it, expect, vi } from "vitest";
import { actionRegistry, ActionDefinition, ActionHandler } from "../../../actions/action-registry";
import { ActionParams } from "../../../actions/action-params";
// Importing the barrel auto-registers the core actions on the singleton.
import "../../../actions";
import { LocationActionsEnum } from "../../../enums";
import { makeMetaState, makePlayer } from "../factories";

const def = (id: string, extra: Partial<ActionDefinition> = {}): ActionDefinition => ({
    id,
    displayName: id,
    inputSpec: { inputType: "none" },
    ...extra,
});

describe("ActionRegistry registration & lookup", () => {
    it("registers and reports a new action", () => {
        const handler: ActionHandler = { execute: () => {} };
        actionRegistry.register(def("test.alpha", { tags: ["unit-tag"] }), handler);

        expect(actionRegistry.has("test.alpha")).toBe(true);
        expect(actionRegistry.getDefinition("test.alpha")?.displayName).toBe("test.alpha");
        expect(actionRegistry.getHandler("test.alpha")).toBe(handler);
        expect(actionRegistry.getInputSpec("test.alpha")).toEqual({ inputType: "none" });
    });

    it("warns when overwriting an existing action id", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        actionRegistry.register(def("test.dup"), { execute: () => {} });
        actionRegistry.register(def("test.dup"), { execute: () => {} });
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("already registered"));
        warn.mockRestore();
    });

    it("requiresInput reflects the input spec", () => {
        actionRegistry.register(def("test.noinput", { inputSpec: { inputType: "none" } }), { execute: () => {} });
        actionRegistry.register(
            def("test.cards", { inputSpec: { inputType: "cardSelection", source: "hand", minCount: 1, maxCount: 1 } }),
            { execute: () => {} }
        );
        expect(actionRegistry.requiresInput("test.noinput")).toBe(false);
        expect(actionRegistry.requiresInput("test.cards")).toBe(true);
        expect(actionRegistry.requiresInput("test.unknown")).toBe(false);
    });

    it("lists all ids and filters by tag", () => {
        actionRegistry.register(def("test.tagged", { tags: ["filter-me"] }), { execute: () => {} });
        expect(actionRegistry.getAllActionIds()).toContain("test.tagged");
        const tagged = actionRegistry.getActionsByTag("filter-me");
        expect(tagged.map(d => d.id)).toContain("test.tagged");
    });

    it("returns undefined lookups for unknown ids", () => {
        expect(actionRegistry.getDefinition("nope")).toBeUndefined();
        expect(actionRegistry.getHandler("nope")).toBeUndefined();
        expect(actionRegistry.getInputSpec("nope")).toBeUndefined();
    });
});

describe("ActionRegistry.execute", () => {
    const state = makeMetaState();
    const player = makePlayer();

    it("fails for an unknown action", () => {
        const result = actionRegistry.execute("does.not.exist", {} as ActionParams, state, player);
        expect(result).toEqual({ success: false, error: "Unknown action: does.not.exist" });
    });

    it("runs the handler and reports success", () => {
        const execute = vi.fn();
        actionRegistry.register(def("test.run"), { execute });
        const result = actionRegistry.execute("test.run", { actionType: "x" } as any, state, player);
        expect(result).toEqual({ success: true });
        expect(execute).toHaveBeenCalledOnce();
    });

    it("short-circuits when validation returns an error", () => {
        const execute = vi.fn();
        actionRegistry.register(def("test.invalid"), {
            validate: () => "bad input",
            execute,
        });
        const result = actionRegistry.execute("test.invalid", {} as ActionParams, state, player);
        expect(result).toEqual({ success: false, error: "bad input" });
        expect(execute).not.toHaveBeenCalled();
    });

    it("executes when validation passes (returns null)", () => {
        const execute = vi.fn();
        actionRegistry.register(def("test.valid"), {
            validate: () => null,
            execute,
        });
        const result = actionRegistry.execute("test.valid", {} as ActionParams, state, player);
        expect(result.success).toBe(true);
        expect(execute).toHaveBeenCalledOnce();
    });

    it("has the core DRAW action registered via the barrel import", () => {
        expect(actionRegistry.has(LocationActionsEnum.DRAW)).toBe(true);
    });
});
