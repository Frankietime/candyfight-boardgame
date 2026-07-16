/**
 * Reveal (secondary) effects — fired from the player's REVEALED HAND:
 * a free-form bag of resources/actions (same shape as Play), plus the
 * special-cased Puzzle challenge (+1 VP when the rest of the revealed hand
 * qualifies against its configured icon/wildcard requirement).
 */
import { describe, it, expect } from "vitest";
import "../actions/core-actions";
import { executeRevealEffects } from "../services/moves/phaseService";
import { getPuzzleRequirement, hasAnyReveal, hasFightReveal, hasPuzzleReveal, RevealSecondary } from "../mods/revealEffects";
import { DEFAULT_PUZZLE_REQUIREMENT } from "../services/puzzleService";
import { DistrictIconsEnum, LocationActionsEnum, ResourceEnum } from "../enums";
import {
    makeCard,
    makeDistrict,
    makeGameState,
    makeLocation,
    makeMetaState,
    makePlayer,
} from "./unit/factories";

const { D1, D2, D3, D4 } = DistrictIconsEnum;

const fightSecondary = (): RevealSecondary => ({
    secondaryEffects: [{ actionId: LocationActionsEnum.ADD_PRESENCE_TOKEN, name: "Fight!" }],
});
const candySecondary = (): RevealSecondary => ({
    secondaryResources: [{ resourceId: ResourceEnum.Candy, amount: 1 }],
});
const puzzleSecondary = (requirement = DEFAULT_PUZZLE_REQUIREMENT): RevealSecondary => ({
    secondaryEffects: [{ actionId: LocationActionsEnum.STRANGE_CANDY_PUZZLE, name: "Puzzle", params: requirement }],
});

const revealCard = (secondary: RevealSecondary, districtIds: DistrictIconsEnum[] = [D1, D3]) =>
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
        const player = makePlayer({ id: "0", candy: 2, hand: [revealCard(candySecondary())] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.candy).toBe(3);
        expect(state.G.log.some(e => e.message.includes("+1 candy") && e.message.includes("reveal"))).toBe(true);
    });

    it("Fight! goes to the CHOSEN district when the player has an agent there", () => {
        const fightCard = revealCard(fightSecondary(), [D1, D3]);
        const player = makePlayer({ id: "0", hand: [fightCard] });
        const { state } = setup(player, [D1, D3]);

        executeRevealEffects(state, player, { fightDistricts: { [fightCard.id]: D3 } });

        expect(state.G.districts[1].presence["0"]).toEqual({ playerID: "0", amount: 1 });
        expect(state.G.districts[0].presence["0"]).toBeUndefined();
    });

    it("Fight! rejects a district without the player's agent (falls back to an eligible one)", () => {
        const fightCard = revealCard(fightSecondary(), [D1, D3]);
        const player = makePlayer({ id: "0", hand: [fightCard] });
        const { state } = setup(player, [D1]); // agent only in D1

        executeRevealEffects(state, player, { fightDistricts: { [fightCard.id]: D3 } });

        expect(state.G.districts[0].presence["0"]).toEqual({ playerID: "0", amount: 1 });
        expect(state.G.districts[1].presence["0"]).toBeUndefined();
    });

    it("Fight! fizzles when the player has no agents anywhere", () => {
        const fightCard = revealCard(fightSecondary(), [D1, D3]);
        const player = makePlayer({ id: "0", hand: [fightCard] });
        const { state } = setup(player, []);

        executeRevealEffects(state, player, { fightDistricts: { [fightCard.id]: D1 } });

        expect(state.G.districts[0].presence["0"]).toBeUndefined();
        expect(state.G.districts[1].presence["0"]).toBeUndefined();
        expect(state.G.log.some(e => e.message.includes("fizzles"))).toBe(true);
    });

    it("Puzzle grants +1 VP when the REST of the revealed hand qualifies (auto-attempt)", () => {
        const puzzle = revealCard(puzzleSecondary(), [D1, D2, D3, D4]);
        const symbols = [D1, D2, D3, D4, D1, D2].map(d => makeCard({ districtIds: [d] }));
        const player = makePlayer({ id: "0", victoryPoints: 0, hand: [puzzle, ...symbols] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.victoryPoints).toBe(1);
        expect(state.G.log.some(e => e.message.includes("solved the Puzzle"))).toBe(true);
    });

    it("Puzzle honors an explicit valid selection", () => {
        const puzzle = revealCard(puzzleSecondary(), [D1, D2, D3, D4]);
        const symbols = [D1, D2, D3, D4, D1, D2].map(d => makeCard({ districtIds: [d] }));
        const player = makePlayer({ id: "0", victoryPoints: 0, hand: [puzzle, ...symbols] });
        const { state } = setup(player);
        executeRevealEffects(state, player, {
            puzzleSelections: { [puzzle.id]: symbols.map(c => c.id) },
        });
        expect(player.victoryPoints).toBe(1);
    });

    it("Puzzle fails on an explicit INSUFFICIENT selection even if the hand could solve it", () => {
        const puzzle = revealCard(puzzleSecondary(), [D1, D2, D3, D4]);
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
        const puzzle = revealCard(puzzleSecondary(), [D1, D2, D3, D4]);
        const symbols = [D1, D2, D3, D4, D1, D2].map(d => makeCard({ districtIds: [d] }));
        const player = makePlayer({ id: "0", victoryPoints: 0, hand: [puzzle, ...symbols] });
        const { state } = setup(player);
        executeRevealEffects(state, player, {
            puzzleSelections: { [puzzle.id]: [...symbols.map(c => c.id), "forged-card"] },
        });
        expect(player.victoryPoints).toBe(0);
    });

    it("the Puzzle card itself does NOT count toward its own challenge", () => {
        const puzzle = revealCard(puzzleSecondary(), [D1, D2, D3, D4]);
        const others = [D2, D3, D4, D2, D3].map(d => makeCard({ districtIds: [d] }));
        const player = makePlayer({ id: "0", victoryPoints: 0, hand: [puzzle, ...others] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.victoryPoints).toBe(0);
        expect(state.G.log.some(e => e.message.includes("Puzzle failed"))).toBe(true);
    });

    it("honors a CONFIGURED puzzle requirement different from the default", () => {
        // Only 2×D1 required, 1 wildcard — solvable with far fewer cards than the default.
        const puzzle = revealCard(puzzleSecondary({ symbolCounts: { [D1]: 2 }, wildcards: 1 }), [D2]);
        const player = makePlayer({
            id: "0", victoryPoints: 0,
            hand: [puzzle, makeCard({ districtIds: [D1] }), makeCard({ districtIds: [D1] }), makeCard({ districtIds: [D3] })],
        });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.victoryPoints).toBe(1);
    });

    it("cards PLAYED this round do not fire (only the revealed hand does)", () => {
        const player = makePlayer({
            id: "0",
            candy: 2,
            hand: [],
            cardsInPlay: [revealCard(candySecondary())],
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

describe("reveal payload predicates", () => {
    it("hasFightReveal / hasPuzzleReveal / hasAnyReveal classify by actionId, not by name", () => {
        expect(hasFightReveal(fightSecondary())).toBe(true);
        expect(hasPuzzleReveal(fightSecondary())).toBe(false);
        expect(hasAnyReveal(fightSecondary())).toBe(true);

        expect(hasFightReveal(puzzleSecondary())).toBe(false);
        expect(hasPuzzleReveal(puzzleSecondary())).toBe(true);

        expect(hasAnyReveal(candySecondary())).toBe(true);
        expect(hasAnyReveal({})).toBe(false);
    });

    it("a card can carry BOTH a Fight action and a plain resource at once (free-form reveal)", () => {
        const both: RevealSecondary = {
            secondaryResources: [{ resourceId: ResourceEnum.Loot, amount: 1 }],
            secondaryEffects: [{ actionId: LocationActionsEnum.ADD_PRESENCE_TOKEN, name: "Fight!" }],
        };
        expect(hasFightReveal(both)).toBe(true);
        expect(hasAnyReveal(both)).toBe(true);
    });

    it("getPuzzleRequirement returns the card's own params, defaulting to the classic shape", () => {
        expect(getPuzzleRequirement(fightSecondary())).toBeUndefined();
        expect(getPuzzleRequirement(puzzleSecondary())).toEqual(DEFAULT_PUZZLE_REQUIREMENT);
        const custom = { symbolCounts: { [D1]: 3 }, wildcards: 0 };
        expect(getPuzzleRequirement(puzzleSecondary(custom))).toEqual(custom);
    });
});
