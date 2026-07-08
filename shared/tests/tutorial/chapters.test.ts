import { describe, it, expect } from "vitest";
import { tutorialChapters } from "../../tutorial/chapters";
import { simulateChapter } from "../../tutorial/simulate";
import { ResourceEnum, DistrictIconsEnum } from "../../enums";

const byId = (id: string) => tutorialChapters.find(c => c.id === id)!;

describe("Tutorial chapters — runnable scripted scenarios", () => {
    it("has the four chapters in order", () => {
        expect(tutorialChapters.map(c => c.id)).toEqual(["basics", "build", "signet", "combat"]);
    });

    it("every chapter's happy path runs without throwing", () => {
        for (const chapter of tutorialChapters) {
            expect(() => simulateChapter(chapter)).not.toThrow();
        }
    });

    it("Ch.1 Basics: pays Time is Gold's 2 loot cost, draws 2, claims it, and gains presence in AGI", () => {
        const engine = simulateChapter(byId("basics"));
        const p = engine.getPlayer("0");
        // AGI = district index 3, Time is Gold = location 1. Cost 2 loot (started at 2 → 0).
        expect(p[ResourceEnum.Loot]).toBe(0);
        expect(p.currentNumberOfWorkers).toBe(1);
        expect(engine.state.districts[3].locations[1].takenByPlayerID).toBe("0");
        // claim +1 and the single-district card's addPresence +1.
        expect(engine.state.districts[3].presence["0"].amount).toBe(2);
        // Reward drew 2: played 1 of 5 → 4, +2 → 6 in hand.
        expect(p.hand).toHaveLength(6);
    });

    it("Ch.2 Build: presence in the Streets, trashes 2 fillers, buys a card, and gains a Sword Master worker", () => {
        const engine = simulateChapter(byId("build"));
        const p = engine.getPlayer("0");
        // Streets = district index 2 (Easy Job): claim +1, card +1 → 2.
        expect(engine.state.districts[2].presence["0"].amount).toBe(2);
        // Trash cost picked the two fillers (not the Sword Master card).
        expect(p.trashPile.map(c => c.id).sort()).toEqual(["v-f1", "v-f2"]);
        // Bought card landed in discard.
        expect(p.discardPile.some(c => c.id === "v-buy")).toBe(true);
        // Sword Master raised the worker cap (started at 3).
        expect(p.maxNumberOfWorkers).toBe(4);
        // The rival also plays: it claims Time is Gold (AGI = district 3, location 1).
        expect(engine.state.districts[3].locations[1].takenByPlayerID).toBe("1");
    });

    it("Ch.3 Signet: Street Wizards signet grants +3 loot, plus Easy Job's +1, claiming the Streets", () => {
        const engine = simulateChapter(byId("signet"));
        const p = engine.getPlayer("0");
        // Street Wizards signet (+3 loot) plus Easy Job (+1 loot), starting from 0.
        expect(p[ResourceEnum.Loot]).toBe(4);
        // Signet claimed Easy Job in the Streets (district 2, location 0).
        expect(engine.state.districts[2].locations[0].takenByPlayerID).toBe("0");
    });

    it("Ch.4 Combat: you reveal, the rival pours into AGI (signet + sword), then combat scores; ties score nothing", () => {
        const engine = simulateChapter(byId("combat"));
        // You revealed without further plays.
        expect(engine.getPlayer("0").hasRevealed).toBe(true);
        // You lead the Streets, the rival leads the AGI zone, Ecoplex is tied.
        expect(engine.getPlayer("0").victoryPoints).toBe(1);
        expect(engine.getPlayer("1").victoryPoints).toBe(1);
        const ecoplex = engine.state.districts.find(d => d.id === DistrictIconsEnum.D2);
        expect(ecoplex?.combatWinnerId).toBeUndefined();
        const streets = engine.state.districts.find(d => d.id === DistrictIconsEnum.D3);
        expect(streets?.combatWinnerId).toBe("0");
        const agi = engine.state.districts.find(d => d.id === DistrictIconsEnum.D4);
        expect(agi?.combatWinnerId).toBe("1");
        // The rival's Tech Bros signet drew cards (asymmetry vs your +3 loot).
        expect(engine.getPlayer("1").hand.length).toBeGreaterThan(0);
    });
});
