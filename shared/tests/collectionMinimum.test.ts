/**
 * Collection-minimum invariant tests.
 *
 * Root cause of the "bot does nothing" stall: trashing 2 cards at 6 total was
 * allowed (guard checked the total BEFORE trashing), leaving a player with 4
 * cards. maintenancePhase.endIf required hand.length === 5 for everyone, which
 * a 4-card player can never satisfy → the phase never ended → enumerate
 * returned [] → the Local() bot loop crashed on a null action and the game
 * froze. Two fixes, both asserted here:
 *   1. TRASH rejects when it would leave fewer than 5 total cards.
 *   2. maintenancePhase ends even for players who cannot refill to 5.
 */
import { describe, it, expect } from "vitest";
import { Client } from "boardgame.io/client";
import { actionRegistry } from "../actions";
import { LocationActionsEnum, CharacterEnum, ResourceEnum } from "../enums";
import { Game } from "../Game";
import { getInitialDistrictsState } from "../services/locationServices";
import { DEFAULT_MARKET_TIER, INITIAL_NUMBER_OF_WORKERS, NO_CARD_SELECTED } from "../constants";
import { DEFAULT_GAME_CONFIG, GameState, Card } from "../types";
import { getBaseMod } from "../mods/baseMod";

const card = (id: string): Card => ({ id, name: id, districtIds: ["LOC1"] });

const mkPlayer = (id: string, deck: Card[], hand: Card[] = [], discardPile: Card[] = []) => ({
    id,
    characterId: undefined as any,
    currentNumberOfWorkers: 0,
    maxNumberOfWorkers: INITIAL_NUMBER_OF_WORKERS,
    selectedCard: NO_CARD_SELECTED,
    hasPlayedCard: false,
    [ResourceEnum.Candy]: 5,
    [ResourceEnum.Loot]: 5,
    victoryPoints: 0,
    deck,
    hand,
    discardPile,
    trashPile: [] as Card[],
    hasRevealed: false,
});

describe("TRASH minimum-collection guard", () => {
    const mgState = { G: { log: [] }, ctx: { currentPlayer: "0" } } as any;

    it("rejects trashing 2 when only 6 cards remain (would leave 4)", () => {
        const player: any = mkPlayer("0", [card("d1")], [card("h1"), card("h2"), card("h3")], [card("p1"), card("p2")]);
        const result = actionRegistry.execute(
            LocationActionsEnum.TRASH,
            { actionType: "trash", cardIds: ["h1", "h2"] } as any,
            mgState, player
        );
        expect(result.success).toBe(false);
        expect(player.hand).toHaveLength(3);
        expect(player.trashPile).toHaveLength(0);
    });

    it("allows trashing 2 when 7 cards remain (leaves 5)", () => {
        const player: any = mkPlayer("0", [card("d1"), card("d2")], [card("h1"), card("h2"), card("h3")], [card("p1"), card("p2")]);
        const result = actionRegistry.execute(
            LocationActionsEnum.TRASH,
            { actionType: "trash", cardIds: ["h1", "h2"] } as any,
            mgState, player
        );
        expect(result.success).toBe(true);
        expect(player.trashPile).toHaveLength(2);
    });
});

describe("maintenancePhase with a short-decked player", () => {
    it("still advances to mainPhase when a player cannot refill to 5 cards", () => {
        // Player 0 owns only 4 cards in total (the pre-fix endIf hung forever here).
        const shortGame = {
            ...Game,
            playerView: undefined, // full state for assertions
            setup: () => ({
                players: {
                    "0": mkPlayer("0", [card("a1"), card("a2"), card("a3"), card("a4")]),
                    "1": mkPlayer("1", Array.from({ length: 6 }, (_, i) => card(`b${i}`))),
                },
                districts: getInitialDistrictsState(),
                markets: { [DEFAULT_MARKET_TIER]: [] },
                characters: getBaseMod().characters!,
                roundEndingCounter: 0,
                gameEndingCounter: 0,
                ranking: [],
                playersViewModel: [],
                config: { ...DEFAULT_GAME_CONFIG, numPlayers: 2 },
                log: [],
            }) as GameState,
        };
        const client = Client({ game: shortGame as any, numPlayers: 2, playerID: "0" });
        client.start();
        client.moves.selectCharacter(CharacterEnum.Kawaiisis);
        client.updatePlayerID("1");
        client.moves.selectCharacter(CharacterEnum.TechBros);

        const state = client.getState()!;
        expect(state.ctx.phase).toBe("mainPhase"); // NOT stuck in maintenancePhase
        expect(state.G.players["0"].hand).toHaveLength(4); // dealt everything it had
        expect(state.G.players["1"].hand).toHaveLength(5);
    });
});
