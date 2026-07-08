import { describe, it, expect } from "vitest";
import { buildTutorState, TutorEngine } from "../../tutorial/tutorEngine";
import { getTierOneCards } from "../../services/cardServices";
import { DistrictIconsEnum, ResourceEnum } from "../../enums";

// Board indices (see getInitialDistrictsState): Streets = district 2, Easy Job = location 0.
const STREETS_IDX = 2;
const EASY_JOB_IDX = 0;

const d3Card = () => {
    const card = getTierOneCards().find(c => c.districtIds.includes(DistrictIconsEnum.D3))!;
    return { ...card, id: "tut-d3" };
};

describe("TutorEngine — placeWorker against real services", () => {
    it("plays a D3 card at Easy Job: claims it, gains +1 loot reward and presence", () => {
        const engine = new TutorEngine(
            buildTutorState({
                players: [{ id: "0", hand: [d3Card()] }, { id: "1" }],
            })
        );

        const select = engine.selectCard("0", "tut-d3");
        expect(select.ok).toBe(true);

        const place = engine.placeWorker("0", STREETS_IDX, EASY_JOB_IDX, "tut-d3");
        expect(place.ok).toBe(true);

        const player = engine.getPlayer("0");
        // Easy Job reward = +1 loot; started at default 2.
        expect(player[ResourceEnum.Loot]).toBe(3);
        // One worker spent.
        expect(player.currentNumberOfWorkers).toBe(1);
        // Turn state reset after placement so the next lesson step can play again.
        expect(player.hasPlayedCard).toBe(false);
        // Card left hand → discard.
        expect(player.hand).toHaveLength(0);
        expect(player.discardPile.map(c => c.id)).toContain("tut-d3");

        // Presence: +1 from claiming the location, +1 from the card's addPresence effect.
        const streets = engine.state.districts[STREETS_IDX];
        expect(streets.presence["0"].amount).toBe(2);
        // Location is claimed by player 0.
        expect(streets.locations[EASY_JOB_IDX].takenByPlayerID).toBe("0");
    });

    it("rejects placing a card whose district does not match the location", () => {
        const engine = new TutorEngine(
            buildTutorState({ players: [{ id: "0", hand: [d3Card()] }, { id: "1" }] })
        );
        engine.selectCard("0", "tut-d3");
        // Conurbaplex (district 0) cannot host a D3-only card.
        const place = engine.placeWorker("0", 0, 1, "tut-d3");
        expect(place.ok).toBe(false);
    });

    it("awards +1 VP to the presence leader in combat; ties award nothing", () => {
        const engine = new TutorEngine(
            buildTutorState({
                players: [
                    { id: "0", hand: [d3Card()] },
                    { id: "1" },
                ],
            })
        );
        engine.selectCard("0", "tut-d3");
        engine.placeWorker("0", STREETS_IDX, EASY_JOB_IDX, "tut-d3");

        const winners = engine.runCombat();
        // Player 0 is sole presence in Streets → wins it.
        expect(winners[DistrictIconsEnum.D3]).toBe("0");
        expect(engine.getPlayer("0").victoryPoints).toBe(1);
        // Districts with no presence → no winner.
        expect(winners[DistrictIconsEnum.D1]).toBeUndefined();
    });
});
