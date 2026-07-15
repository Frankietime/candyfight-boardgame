/**
 * Test game factory: deterministic setup so every test starts
 * with known cards in each player's hand.
 *
 * Deck layout (last 5 entries become the hand via deck.pop()):
 *   [...fillers, D3_CARD, filler, D4_CARD, SIGNET_CARD]
 * After dealHands the hand is: [SIGNET, D4, filler, D3, filler]
 */
import { Game as GameInterface } from 'boardgame.io';
import { Game } from '../../Game';
import { GameState, Card } from '../../types';
import { getInitialDistrictsState } from '../../services/locationServices';
import { getSignetCard, getTierOneCards } from '../../services/cardServices';
import { DistrictIconsEnum, ResourceEnum } from '../../enums';
import { DEFAULT_MARKET_TIER, INITIAL_NUMBER_OF_WORKERS, NO_CARD_SELECTED } from '../../constants';
import { DEFAULT_GAME_CONFIG } from '../../types';

// ─── Exported card constants used in test assertions ───────────────────────

const _tierOne = getTierOneCards();

export const D4_CARD: Card = {
    ..._tierOne.find(c => c.districtIds.includes(DistrictIconsEnum.D4))!,
    id: 'test-d4',
};

export const D3_CARD: Card = {
    ..._tierOne.find(c => c.districtIds.includes(DistrictIconsEnum.D3))!,
    id: 'test-d3',
};

export const SIGNET_CARD: Card = getSignetCard(); // covers all districts

// ─── Location indices for placeWorker(districtIdx, locationIdx, card) ────

export const LOC = {
    /** D3 – no resource cost, only needs a D3 card */
    EASY_JOB:     { districtIdx: 2, locationIdx: 0 },
    /** D4 – costs 4 Candy, needs a D4 card */
    SWORD_MASTER: { districtIdx: 3, locationIdx: 2 },
};

// ─── Deck builder ─────────────────────────────────────────────────────────

/**
 * Five-card deck. pop() takes from the end, so dealHands draws:
 *   1st → SIGNET_CARD
 *   2nd → D4_CARD
 *   3rd → filler
 *   4th → D3_CARD
 *   5th → filler
 */
const buildTestDeck = (): Card[] => [
    { ...SIGNET_CARD, id: 'test-filler-1' },
    D3_CARD,
    { ...SIGNET_CARD, id: 'test-filler-2' },
    D4_CARD,
    SIGNET_CARD,
];

// ─── Test game factory ────────────────────────────────────────────────────

export const createTestGame = (): GameInterface<GameState> => ({
    ...Game,
    // Override setup to skip random card shuffling and give every player
    // the same deterministic 5-card deck.
    setup: ({ ctx }) => ({
        config: { ...DEFAULT_GAME_CONFIG, numPlayers: ctx.numPlayers },
        log: [],
        players: Object.fromEntries(
            Array.from({ length: ctx.numPlayers }, (_, i) => [
                i.toString(),
                {
                    id: i.toString(),
                    cardsInPlay: [],
                    currentNumberOfWorkers: 0,   // playersSetup will set to maxWorkers
                    maxNumberOfWorkers: INITIAL_NUMBER_OF_WORKERS,
                    selectedCard: NO_CARD_SELECTED,
                    hasPlayedCard: false,
                    [ResourceEnum.Candy]: 8,
                    [ResourceEnum.Loot]: 2,
                    victoryPoints: 0,
                    deck: buildTestDeck(),
                    hand: [],
                    discardPile: [],
                    trashPile: [],
                    hasRevealed: false,
                }
            ])
        ),
        districts: getInitialDistrictsState(),
        markets: { [DEFAULT_MARKET_TIER]: [] },
        roundEndingCounter: 0,
        gameEndingCounter: 0,
        ranking: [],
        playersViewModel: [],
    }) as GameState,
});
