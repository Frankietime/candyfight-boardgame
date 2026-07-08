/**
 * TutorEngine — runs the implemented ruleset over a plain, scripted GameState.
 *
 * It does NOT use boardgame.io's reducer/RNG. Instead it mutates a {@link GameState}
 * by calling the *real* shared services (placeWorker, draw, selectCard, resolveCombat,
 * …) through a constructed {@link MetaGameState}. This keeps rule execution authentic
 * while giving the tutorial full scripting + determinism control.
 *
 * Used by:
 *  - chapter `onEnter` hooks to play scripted opponent moves,
 *  - the client to apply the player's interactions (gated against the returned result).
 */
import { Ctx } from "boardgame.io";
import { Card, GameState, Location, MetaGameState, PlayerGameState } from "../types";
import { DEFAULT_GAME_CONFIG, GameConfig } from "../types";
import { CharacterEnum, ResourceEnum } from "../enums";
import { INITIAL_NUMBER_OF_WORKERS, NO_CARD_SELECTED } from "../constants";
import { getInitialDistrictsState } from "../services/locationServices";
import { isWorkerPlacementValid } from "../game-helper";
import { placeWorker, WorkerMoveParams } from "../services/moves/workerPlacementService";
import { draw as drawService, selectCard as selectCardService } from "../services/moves/moves";
import { resolveCombat } from "../services/moves/phaseService";
import { appendLog } from "../services/logService";
import { createDeterministicRandom, DeterministicRandom } from "./deterministicRandom";
import { TutorMoveResult } from "./types";
// Side-effect import: registers the core actions used by placeWorker.
import "../actions/core-actions";

/** Per-player seed for {@link buildTutorState}. */
export type TutorPlayerSeed = {
    id: string;
    characterId?: CharacterEnum;
    candy?: number;
    loot?: number;
    victoryPoints?: number;
    maxNumberOfWorkers?: number;
    /** Cards placed directly in hand (no shuffling). */
    hand?: Card[];
    /** Remaining draw pile (top of deck = last element, popped first). */
    deck?: Card[];
    discardPile?: Card[];
};

export type TutorStateSeed = {
    players: TutorPlayerSeed[];
    /** Visible market row. */
    cardMarket?: Card[];
    config?: Partial<GameConfig>;
    /** Preset presence tokens (for lessons that start mid-round, e.g. combat). */
    districtPresence?: { districtIndex: number; playerId: string; amount: number }[];
};

/** Builds a deterministic GameState for a chapter from a compact seed. */
export const buildTutorState = (seed: TutorStateSeed): GameState => {
    const players: Record<string, PlayerGameState> = {};
    seed.players.forEach(p => {
        players[p.id] = {
            id: p.id,
            characterId: p.characterId,
            cardsInPlay: [],
            hasPlayedCard: false,
            currentNumberOfWorkers: p.maxNumberOfWorkers ?? INITIAL_NUMBER_OF_WORKERS,
            maxNumberOfWorkers: p.maxNumberOfWorkers ?? INITIAL_NUMBER_OF_WORKERS,
            selectedCard: NO_CARD_SELECTED,
            [ResourceEnum.Candy]: p.candy ?? DEFAULT_GAME_CONFIG.initialCandy,
            [ResourceEnum.Loot]: p.loot ?? DEFAULT_GAME_CONFIG.initialLoot,
            victoryPoints: p.victoryPoints ?? 0,
            deck: p.deck ?? [],
            hand: p.hand ?? [],
            discardPile: p.discardPile ?? [],
            trashPile: [],
            hasRevealed: false,
        };
    });

    const districts = getInitialDistrictsState();
    seed.districtPresence?.forEach(({ districtIndex, playerId, amount }) => {
        const district = districts[districtIndex];
        if (district) district.presence[playerId] = { playerID: playerId, amount };
    });

    return {
        players,
        districts,
        cardMarket: seed.cardMarket ?? [],
        roundEndingCounter: 0,
        gameEndingCounter: 0,
        ranking: [],
        playersViewModel: [],
        config: { ...DEFAULT_GAME_CONFIG, ...seed.config, numPlayers: seed.players.length },
        log: [],
    };
};

export class TutorEngine {
    G: GameState;
    private ctx: Ctx;
    private random: DeterministicRandom;

    constructor(initial: GameState) {
        this.G = initial;
        this.random = createDeterministicRandom();
        const playOrder = Object.keys(initial.players);
        this.ctx = {
            numPlayers: playOrder.length,
            playOrder,
            playOrderPos: 0,
            currentPlayer: playOrder[0],
            turn: 1,
            phase: "mainPhase",
            activePlayers: null,
        } as unknown as Ctx;
    }

    /** Current public state (the client reads this to render). */
    get state(): GameState {
        return this.G;
    }

    getPlayer(playerId: string): PlayerGameState {
        return this.G.players[playerId];
    }

    /** Sets whose move the engine is applying (affects logs/effects context). */
    setCurrentPlayer(playerId: string): void {
        this.ctx = { ...this.ctx, currentPlayer: playerId };
    }

    private mgState(): MetaGameState {
        return { G: this.G, ctx: this.ctx, random: this.random, events: { endTurn: () => {} } };
    }

    private findLocation(districtIndex: number, locationIndex: number): Location | undefined {
        return this.G.districts[districtIndex]?.locations[locationIndex];
    }

    private findHandCard(player: PlayerGameState, cardId: string): Card | undefined {
        return player.hand.find(c => c.id === cardId);
    }

    /** Mirrors the `selectCard` move. */
    selectCard(playerId: string, cardId: string): TutorMoveResult {
        this.setCurrentPlayer(playerId);
        const player = this.getPlayer(playerId);
        const card = this.findHandCard(player, cardId);
        if (!card) return { ok: false, reason: "Card not in hand" };
        const result = selectCardService(player, card);
        if (result === "INVALID_MOVE") return { ok: false, reason: "Cannot select this card" };
        return { ok: true };
    }

    /**
     * Mirrors the `placeWorker` move: plays the card to a matching location,
     * pays costs, collects rewards, claims the location (+presence).
     */
    placeWorker(
        playerId: string,
        districtIndex: number,
        locationIndex: number,
        cardId: string,
        moveParams?: WorkerMoveParams
    ): TutorMoveResult {
        this.setCurrentPlayer(playerId);
        const player = this.getPlayer(playerId);
        const card = this.findHandCard(player, cardId);
        if (!card) return { ok: false, reason: "Card not in hand" };

        const location = this.findLocation(districtIndex, locationIndex);
        if (!location) return { ok: false, reason: "Unknown location" };

        if (!isWorkerPlacementValid(player, location, card)) {
            return { ok: false, reason: "Invalid worker placement" };
        }

        placeWorker({ mgState: this.mgState(), player, location, card, moveParams });

        // The real game resets this between turns (resetTurnState). The tutorial is a
        // guided sandbox without turn-passing, so reset here to allow the next placement
        // within the same lesson.
        player.hasPlayedCard = false;
        player.selectedCard = NO_CARD_SELECTED;
        return { ok: true };
    }

    /** Draws `count` cards for a player (deterministic, top of deck = last element). */
    draw(playerId: string, count = 1): TutorMoveResult {
        this.setCurrentPlayer(playerId);
        drawService(this.getPlayer(playerId), this.random, count);
        return { ok: true };
    }

    /** Marks a player revealed — ends their participation in the round. */
    reveal(playerId: string): TutorMoveResult {
        this.setCurrentPlayer(playerId);
        const player = this.getPlayer(playerId);
        player.hasRevealed = true;
        appendLog(this.G, {
            playerID: playerId,
            phase: this.ctx.phase ?? "mainPhase",
            type: "move",
            message: "revealed",
        });
        return { ok: true };
    }

    /**
     * Resolves combat across all districts (most presence wins +1 VP, ties = none).
     * Returns the winner id per district id for narration.
     */
    runCombat(): Record<string, string | undefined> {
        this.ctx = { ...this.ctx, phase: "combatPhase" };
        resolveCombat(this.G, "combatPhase");
        const winners: Record<string, string | undefined> = {};
        this.G.districts.forEach(d => {
            winners[d.id] = d.combatWinnerId;
        });
        return winners;
    }
}
