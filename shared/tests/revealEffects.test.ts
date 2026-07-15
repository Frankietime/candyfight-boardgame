/**
 * Reveal (secondary) effects — integration through executeRevealEffects and
 * the curated catalog: +1 Fight (presence in the played district), +1 Candy,
 * Puzzle (+1 VP with a qualifying revealed hand).
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
    makeMetaState,
    makePlayer,
} from "./unit/factories";

const { D1, D2, D3, D4 } = DistrictIconsEnum;

const playedCard = (secondary: ReturnType<typeof buildRevealSecondary>, playedDistrictId = D3 as string) =>
    ({ ...makeCard({}), ...secondary, playedDistrictId });

const setup = (player = makePlayer({ id: "0" })) => {
    const state = makeMetaState({
        G: makeGameState({
            players: { "0": player },
            districts: [makeDistrict({ id: D3, presence: {} })],
        }),
    });
    return { player, state };
};

describe("executeRevealEffects", () => {
    it("+1 Candy adds one candy and logs it", () => {
        const player = makePlayer({ id: "0", candy: 2, cardsInPlay: [playedCard(buildRevealSecondary("candy"))] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.candy).toBe(3);
        expect(state.G.log.some(e => e.message.includes("+1 candy") && e.message.includes("reveal"))).toBe(true);
    });

    it("+1 Fight adds presence in the district where the card was played", () => {
        const player = makePlayer({ id: "0", cardsInPlay: [playedCard(buildRevealSecondary("fight"), D3)] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(state.G.districts[0].presence["0"]).toEqual({ playerID: "0", amount: 1 });
    });

    it("Puzzle grants +1 VP with a qualifying revealed hand", () => {
        const hand = [D1, D2, D3, D4, D1, D2].map(d => makeCard({ districtIds: [d] }));
        const player = makePlayer({ id: "0", victoryPoints: 0, hand, cardsInPlay: [playedCard(buildRevealSecondary("puzzle"))] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.victoryPoints).toBe(1);
        expect(state.G.log.some(e => e.message.includes("solved the Puzzle"))).toBe(true);
    });

    it("Puzzle fails without the symbols and grants nothing", () => {
        const hand = [D1, D1].map(d => makeCard({ districtIds: [d] }));
        const player = makePlayer({ id: "0", victoryPoints: 0, hand, cardsInPlay: [playedCard(buildRevealSecondary("puzzle"))] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.victoryPoints).toBe(0);
        expect(state.G.log.some(e => e.message.includes("Puzzle failed"))).toBe(true);
    });

    it("cards without secondaries fire nothing", () => {
        const player = makePlayer({ id: "0", candy: 2, cardsInPlay: [makeCard({})] });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.candy).toBe(2);
        expect(state.G.log).toHaveLength(0);
    });

    it("fires every played card's secondary, in play order", () => {
        const player = makePlayer({
            id: "0",
            candy: 0,
            cardsInPlay: [
                playedCard(buildRevealSecondary("candy")),
                playedCard(buildRevealSecondary("fight"), D3),
            ],
        });
        const { state } = setup(player);
        executeRevealEffects(state, player);
        expect(player.candy).toBe(1);
        expect(state.G.districts[0].presence["0"]?.amount).toBe(1);
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
            secondaryEffects: [
                { actionId: "cooldown" as never, name: "Cooldown" },
            ],
        })).toBe("invalid");
        expect(revealEffectOf({
            secondaryResources: [{ resourceId: ResourceEnum.Candy, amount: 1 }],
            secondaryEffects: [{ actionId: "addPresenceToken" as never, name: "x" }],
        })).toBe("invalid");
    });
});
