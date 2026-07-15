/**
 * Reveal (secondary) effects — fired from the player's REVEALED HAND:
 * +1 Fight (presence in the district the player chose), +1 Candy,
 * Puzzle (+1 VP when the rest of the revealed hand qualifies).
 */
import { describe, it, expect } from "vitest";
import "../actions/core-actions";
import { executeRevealEffects } from "../services/moves/phaseService";
import { buildRevealSecondary, revealEffectOf } from "../mods/revealEffects";
import { DistrictIconsEnum, ResourceEnum } from "../enums";
import {
    makeCard,
    makeDistrict,
    makeGameState,
    makeLocation,
    makeMetaState,
    makePlayer,
} from "./unit/factories";

const { D1, D2, D3, D4 } = DistrictIconsEnum;

const revealCard = (secondary: ReturnType<typeof buildRevealSecondary>, districtIds: DistrictIconsEnum[] = [D1, D3]) =>
    ({ ...makeCard({ districtIds }), ...secondary });

/** Board where the player has agents in the districts of `agentsIn`. */
const setup = (player = makePlayer({ id: "0" }), agentsIn: DistrictIconsEnum[] = [D1, D3]) => {
    const district = (id: DistrictIconsEnum) =>
        makeDistrict({
            id,
            presence: {},
            locations: agentsIn.includes(id)
                ? [makeLocation({ districtId: id, takenByPlayerID: player.id })]
                : [makeLocation({ districtId: id })],
        });
    const state = makeMetaState({
        G: makeGameState({
            players: { "0": player },
            districts: [district(D1), district(D3)],
        }),
    });
    return { player, state };
};

describe("executeRevealEffects (revealed hand)", () => {
    it("+1 Candy in the revealed hand adds one candy and logs it", () => {
        const player = makePlayer({ id: "0", candy: 2, hand: [revealCard(buildRevealSecondary("candy"))] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.candy).toBe(3);
        expect(state.G.log.some(e => e.message.includes("+1 candy") && e.message.includes("reveal"))).toBe(true);
    });

    it("+1 Fight goes to the CHOSEN district when the player has an agent there", () => {
        const fightCard = revealCard(buildRevealSecondary("fight"), [D1, D3]);
        const player = makePlayer({ id: "0", hand: [fightCard] });
        const { state } = setup(player, [D1, D3]);

        executeRevealEffects(state, player, { fightDistricts: { [fightCard.id]: D3 } });

        expect(state.G.districts[1].presence["0"]).toEqual({ playerID: "0", amount: 1 });
        expect(state.G.districts[0].presence["0"]).toBeUndefined();
    });

    it("+1 Fight rejects a district without the player's agent (falls back to an eligible one)", () => {
        const fightCard = revealCard(buildRevealSecondary("fight"), [D1, D3]);
        const player = makePlayer({ id: "0", hand: [fightCard] });
        const { state } = setup(player, [D1]); // agent only in D1

        executeRevealEffects(state, player, { fightDistricts: { [fightCard.id]: D3 } });

        expect(state.G.districts[0].presence["0"]).toEqual({ playerID: "0", amount: 1 });
        expect(state.G.districts[1].presence["0"]).toBeUndefined();
    });

    it("+1 Fight fizzles when the player has no agents anywhere", () => {
        const fightCard = revealCard(buildRevealSecondary("fight"), [D1, D3]);
        const player = makePlayer({ id: "0", hand: [fightCard] });
        const { state } = setup(player, []);

        executeRevealEffects(state, player, { fightDistricts: { [fightCard.id]: D1 } });

        expect(state.G.districts[0].presence["0"]).toBeUndefined();
        expect(state.G.districts[1].presence["0"]).toBeUndefined();
        expect(state.G.log.some(e => e.message.includes("fizzles"))).toBe(true);
    });

    it("Puzzle grants +1 VP when the REST of the revealed hand qualifies (auto-attempt)", () => {
        const puzzle = revealCard(buildRevealSecondary("puzzle"), [D1, D2, D3, D4]);
        const symbols = [D1, D2, D3, D4, D1, D2].map(d => makeCard({ districtIds: [d] }));
        const player = makePlayer({ id: "0", victoryPoints: 0, hand: [puzzle, ...symbols] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.victoryPoints).toBe(1);
        expect(state.G.log.some(e => e.message.includes("solved the Puzzle"))).toBe(true);
    });

    it("Puzzle honors an explicit valid selection", () => {
        const puzzle = revealCard(buildRevealSecondary("puzzle"), [D1, D2, D3, D4]);
        const symbols = [D1, D2, D3, D4, D1, D2].map(d => makeCard({ districtIds: [d] }));
        const player = makePlayer({ id: "0", victoryPoints: 0, hand: [puzzle, ...symbols] });
        const { state } = setup(player);
        executeRevealEffects(state, player, {
            puzzleSelections: { [puzzle.id]: symbols.map(c => c.id) },
        });
        expect(player.victoryPoints).toBe(1);
    });

    it("Puzzle fails on an explicit INSUFFICIENT selection even if the hand could solve it", () => {
        const puzzle = revealCard(buildRevealSecondary("puzzle"), [D1, D2, D3, D4]);
        const symbols = [D1, D2, D3, D4, D1, D2].map(d => makeCard({ districtIds: [d] }));
        const player = makePlayer({ id: "0", victoryPoints: 0, hand: [puzzle, ...symbols] });
        const { state } = setup(player);
        executeRevealEffects(state, player, {
            puzzleSelections: { [puzzle.id]: symbols.slice(0, 3).map(c => c.id) },
        });
        expect(player.victoryPoints).toBe(0);
        expect(state.G.log.some(e => e.message.includes("Puzzle failed"))).toBe(true);
    });

    it("Puzzle rejects selections naming cards outside the hand", () => {
        const puzzle = revealCard(buildRevealSecondary("puzzle"), [D1, D2, D3, D4]);
        const symbols = [D1, D2, D3, D4, D1, D2].map(d => makeCard({ districtIds: [d] }));
        const player = makePlayer({ id: "0", victoryPoints: 0, hand: [puzzle, ...symbols] });
        const { state } = setup(player);
        executeRevealEffects(state, player, {
            puzzleSelections: { [puzzle.id]: [...symbols.map(c => c.id), "forged-card"] },
        });
        expect(player.victoryPoints).toBe(0);
    });

    it("the Puzzle card itself does NOT count toward its own challenge", () => {
        // Hand: puzzle (all 4 symbols) + D2, D3, D4 + 2 extra = without the
        // puzzle card D1 is missing → must FAIL.
        const puzzle = revealCard(buildRevealSecondary("puzzle"), [D1, D2, D3, D4]);
        const others = [D2, D3, D4, D2, D3].map(d => makeCard({ districtIds: [d] }));
        const player = makePlayer({ id: "0", victoryPoints: 0, hand: [puzzle, ...others] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.victoryPoints).toBe(0);
        expect(state.G.log.some(e => e.message.includes("Puzzle failed"))).toBe(true);
    });

    it("cards PLAYED this round do not fire (only the revealed hand does)", () => {
        const player = makePlayer({
            id: "0",
            candy: 2,
            hand: [],
            cardsInPlay: [revealCard(buildRevealSecondary("candy"))],
        });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.candy).toBe(2);
        expect(state.G.log).toHaveLength(0);
    });

    it("plain hand cards fire nothing", () => {
        const player = makePlayer({ id: "0", candy: 2, hand: [makeCard({})] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.candy).toBe(2);
        expect(state.G.log).toHaveLength(0);
    });
});

describe("curated reveal catalog", () => {
    it("round-trips build → classify for every id", () => {
        expect(revealEffectOf(buildRevealSecondary("fight"))).toBe("fight");
        expect(revealEffectOf(buildRevealSecondary("candy"))).toBe("candy");
        expect(revealEffectOf(buildRevealSecondary("puzzle"))).toBe("puzzle");
        expect(revealEffectOf(buildRevealSecondary("none"))).toBe("none");
    });

    it("flags anything outside the catalog as invalid", () => {
        expect(revealEffectOf({ secondaryResources: [{ resourceId: ResourceEnum.Loot, amount: 1 }] })).toBe("invalid");
        expect(revealEffectOf({ secondaryResources: [{ resourceId: ResourceEnum.Candy, amount: 2 }] })).toBe("invalid");
        expect(revealEffectOf({
            secondaryEffects: [{ actionId: "cooldown" as never, name: "Cooldown" }],
        })).toBe("invalid");
        expect(revealEffectOf({
            secondaryResources: [{ resourceId: ResourceEnum.Candy, amount: 1 }],
            secondaryEffects: [{ actionId: "addPresenceToken" as never, name: "x" }],
        })).toBe("invalid");
    });
});
