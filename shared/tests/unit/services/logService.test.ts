import { describe, it, expect } from "vitest";
import { appendLog, formatResources } from "../../../services/logService";
import { ResourceEnum } from "../../../enums";
import { makeGameState } from "../factories";

describe("appendLog", () => {
    it("assigns sequential string ids based on log length", () => {
        const G = makeGameState({ log: [] });
        appendLog(G, { playerID: "0", phase: "mainPhase", type: "move", message: "first" });
        appendLog(G, { playerID: "0", phase: "mainPhase", type: "move", message: "second" });
        expect(G.log.map(e => e.id)).toEqual(["0", "1"]);
        expect(G.log[1].message).toBe("second");
    });

    it("caps the log at 150 entries, keeping the most recent", () => {
        const G = makeGameState({ log: [] });
        for (let i = 0; i < 160; i++) {
            appendLog(G, { playerID: "0", phase: "p", type: "effect", message: `m${i}` });
        }
        expect(G.log).toHaveLength(150);
        expect(G.log[G.log.length - 1].message).toBe("m159");
    });
});

describe("formatResources", () => {
    it("formats positive amounts with a + sign and resource label", () => {
        expect(formatResources([{ resourceId: ResourceEnum.Candy, amount: 2 }])).toBe("+2 candy");
        expect(formatResources([{ resourceId: ResourceEnum.Loot, amount: 1 }])).toBe("+1 loot");
    });

    it("negates amounts when rendering a cost", () => {
        expect(formatResources([{ resourceId: ResourceEnum.Candy, amount: 3 }], true)).toBe("-3 candy");
    });

    it("skips zero amounts and joins multiple entries", () => {
        const out = formatResources([
            { resourceId: ResourceEnum.Candy, amount: 0 },
            { resourceId: ResourceEnum.Loot, amount: 2 },
        ]);
        expect(out).toBe("+2 loot");
    });

    it("returns an empty string for no resources", () => {
        expect(formatResources([])).toBe("");
    });
});
