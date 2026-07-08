/**
 * Shared mock factories for unit tests.
 *
 * These build minimal-but-valid domain objects so each unit test can target a
 * single pure function without standing up a full boardgame.io client. Every
 * factory accepts `overrides` so a test states only what it cares about.
 */
import { Ctx } from "boardgame.io";
import {
    Card,
    District,
    GameConfig,
    GameState,
    Location,
    MetaGameState,
    PlayerGameState,
    DEFAULT_GAME_CONFIG,
} from "../../types";
import { DistrictIconsEnum, ResourceEnum } from "../../enums";

/** Deterministic, dependency-free RNG stand-in: identity shuffle. */
export const identityRandom = {
    Shuffle: <T>(arr: T[]): T[] => [...arr],
};

let _cardSeq = 0;
export const makeCard = (overrides: Partial<Card> = {}): Card => ({
    id: `card-${++_cardSeq}`,
    name: "Test Card",
    districtIds: [DistrictIconsEnum.D3],
    ...overrides,
});

export const makePlayer = (overrides: Partial<PlayerGameState> = {}): PlayerGameState => ({
    id: "0",
    characterId: undefined,
    cardsInPlay: [],
    hasPlayedCard: false,
    currentNumberOfWorkers: 2,
    maxNumberOfWorkers: 2,
    selectedCard: undefined,
    [ResourceEnum.Candy]: 5,
    [ResourceEnum.Loot]: 5,
    victoryPoints: 0,
    deck: [],
    discardPile: [],
    trashPile: [],
    hand: [],
    hasRevealed: false,
    ...overrides,
});

export const makeLocation = (overrides: Partial<Location> = {}): Location => ({
    Id: "loc-0",
    districtId: DistrictIconsEnum.D3,
    name: "Test Location",
    cost: { districtIconIds: [DistrictIconsEnum.D3] },
    reward: {},
    isDisabled: false,
    isSelected: false,
    ...overrides,
});

export const makeDistrict = (overrides: Partial<District> = {}): District => ({
    id: DistrictIconsEnum.D3,
    name: "Streets",
    x: 0,
    y: 0,
    presence: {},
    locations: [],
    ...overrides,
});

export const makeConfig = (overrides: Partial<GameConfig> = {}): GameConfig => ({
    ...DEFAULT_GAME_CONFIG,
    ...overrides,
});

export const makeGameState = (overrides: Partial<GameState> = {}): GameState => ({
    players: { "0": makePlayer() },
    districts: [],
    cardMarket: [],
    roundEndingCounter: 0,
    gameEndingCounter: 0,
    ranking: [],
    playersViewModel: [],
    config: makeConfig(),
    log: [],
    ...overrides,
});

export const makeCtx = (overrides: Partial<Ctx> = {}): Ctx =>
    ({
        currentPlayer: "0",
        numPlayers: 1,
        phase: "mainPhase",
        turn: 1,
        playOrder: ["0"],
        playOrderPos: 0,
        ...overrides,
    } as Ctx);

export const makeMetaState = (overrides: Partial<MetaGameState> = {}): MetaGameState => {
    const G = overrides.G ?? makeGameState();
    return {
        G,
        ctx: overrides.ctx ?? makeCtx(),
        random: overrides.random ?? identityRandom,
        playerID: overrides.playerID,
        events: overrides.events,
    };
};
