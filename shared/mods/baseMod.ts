import { CharacterEnum, DistrictIconsEnum, LocationActionsEnum, ResourceEnum } from "../enums";
import { DEFAULT_MARKET_TIER } from "../constants";
import { discardCost, trashCost } from "../services/actions/requirements";
import { BASE_MOD_ID, MOD_SCHEMA_VERSION, ModCard, ModCharacter, ModDefinition, ModLocation } from "./types";
import { DEFAULT_PUZZLE_REQUIREMENT } from "../services/puzzleService";

/** The High Council location shared by every district in the base game. */
const highCouncil = (): ModLocation => ({
    name: "High Council",
    cost: { actions: [discardCost(2)] },
    reward: {
        actions: [
            { actionId: LocationActionsEnum.ADVANCE_TRACKER, name: "+Tracker" },
            { actionId: LocationActionsEnum.ADD_PRESENCE_TOKEN, name: "Fight!" },
        ],
    },
});

// No explicit marketTierId: leaving it unset lets the round-robin default
// (defaultMarketTierIds in buildFromMod.ts) assign tiers automatically —
// with the base mod's single tier that's always "tier1", and it lets a
// freshly-added second tier auto-distribute across market locations without
// the author having to touch every location manually.
const market = (name: string): ModLocation => ({
    name,
    cost: { actions: [trashCost(2)] },
    reward: { actions: [{ actionId: LocationActionsEnum.BUY_CARD, name: "buy card" }] },
});

// ---------------------------------------------------------------------------
// Base decks — authored ids are FIXED strings (getBaseMod must be
// deterministic; a test deep-equals successive calls). Instance ids are
// suffixed at build time (see instantiateCards.ts).
// ---------------------------------------------------------------------------

const addPresenceEffect = () => ({
    actionId: LocationActionsEnum.ADD_PRESENCE_TOKEN,
    name: "Fight!",
});

const ALL_DISTRICTS = Object.values(DistrictIconsEnum);

/** 4 single-district cards + the 3 reveal carriers (fight / candy / puzzle). */
const getBaseDeck = (): ModCard[] => [
    ...ALL_DISTRICTS.map((districtId): ModCard => ({
        id: `bd-${districtId.toLowerCase()}`,
        name: districtId,
        districtIds: [districtId],
        primaryEffects: [addPresenceEffect()],
    })),
    {
        id: "bd-pair-13",
        name: `${DistrictIconsEnum.D1}-${DistrictIconsEnum.D3}`,
        districtIds: [DistrictIconsEnum.D1, DistrictIconsEnum.D3],
        secondaryEffects: [{ actionId: LocationActionsEnum.ADD_PRESENCE_TOKEN, name: "Fight!" }],
    },
    {
        id: "bd-pair-24",
        name: `${DistrictIconsEnum.D2}-${DistrictIconsEnum.D4}`,
        districtIds: [DistrictIconsEnum.D2, DistrictIconsEnum.D4],
        secondaryResources: [{ resourceId: ResourceEnum.Candy, amount: 1 }],
    },
    {
        id: "bd-puzzle",
        name: "Puzzle",
        districtIds: [...ALL_DISTRICTS],
        primaryResources: [{ resourceId: ResourceEnum.Loot, amount: 1 }],
        secondaryEffects: [{
            actionId: LocationActionsEnum.STRANGE_CANDY_PUZZLE,
            name: "Puzzle",
            params: DEFAULT_PUZZLE_REQUIREMENT,
        }],
    },
];

/** Tier 1 market: the 12 ordered district pairs, each adding presence. */
const getTierOneMarketCards = (): ModCard[] =>
    ALL_DISTRICTS.flatMap(id1 =>
        ALL_DISTRICTS
            .filter(id2 => id2 !== id1)
            .map((id2): ModCard => ({
                id: `mk-${id1.toLowerCase()}-${id2.toLowerCase()}`,
                name: `${id1}-${id2}`,
                districtIds: [id1, id2],
                primaryEffects: [addPresenceEffect()],
            }))
    );

/** The 4 built-in characters — same abilities as the original hardcoded
 *  characterDefinitions, now expressed as data (an input-free effect bag,
 *  same shape as a card's play effects) instead of imperative TS code. */
const getBaseCharacters = (): ModCharacter[] => [
    {
        id: CharacterEnum.ChillDudes,
        name: "Chill Dudes",
        description: "They take it slow, but always come prepared.",
        emoji: "😎",
        color: "#93c5fd",
        signet: {
            resources: [{ resourceId: ResourceEnum.Loot, amount: 1 }],
            actions: [{ actionId: LocationActionsEnum.DRAW, name: "Draw", params: { count: 1 } }],
        },
    },
    {
        id: CharacterEnum.Kawaiisis,
        name: "Kawaiisis",
        description: "Don't let the cute exterior fool you.",
        emoji: "🐰",
        color: "#f9a8d4",
        signet: {
            resources: [{ resourceId: ResourceEnum.Candy, amount: 2 }],
            actions: [{ actionId: LocationActionsEnum.ADD_PRESENCE_TOKEN, name: "Fight!" }],
        },
    },
    {
        id: CharacterEnum.StreetWizards,
        name: "Street Wizards",
        description: "They make loot appear from thin air.",
        emoji: "🧙",
        color: "#c4b5fd",
        signet: {
            resources: [{ resourceId: ResourceEnum.Loot, amount: 3 }],
        },
    },
    {
        id: CharacterEnum.TechBros,
        name: "Tech Bros",
        description: "Always optimizing, always drawing.",
        emoji: "💻",
        color: "#86efac",
        signet: {
            resources: [{ resourceId: ResourceEnum.Candy, amount: 1 }],
            actions: [{ actionId: LocationActionsEnum.DRAW, name: "Draw", params: { count: 2 } }],
        },
    },
];

/**
 * The built-in "Base" cartridge: the canonical game content.
 * Single source of truth — getInitialDistrictsState() derives the runtime
 * District[] from this via buildDistrictsFromMod, and the Mod Lab uses it as
 * the template for new mods.
 */
export const getBaseMod = (): ModDefinition => ({
    id: BASE_MOD_ID,
    name: "Base",
    description: "The built-in Candy Fight cartridge",
    schemaVersion: MOD_SCHEMA_VERSION,
    decks: {
        baseDeck: getBaseDeck(),
        marketTiers: [
            { id: DEFAULT_MARKET_TIER, name: "Tier 1", cards: getTierOneMarketCards() },
        ],
    },
    characters: getBaseCharacters(),
    districts: [
        {
            id: DistrictIconsEnum.D1,
            name: "CONURBAPLEX",
            locations: [
                { name: "Restricted Area", cost: {}, reward: {}, isRestrictedArea: true },
                market("CONURBA Market"),
                highCouncil(),
                {
                    name: "Time for Candy",
                    cost: { actions: [discardCost(2)] },
                    reward: { resources: [{ resourceId: ResourceEnum.Candy, amount: 1 }] },
                },
            ],
        },
        {
            id: DistrictIconsEnum.D2,
            name: "ECOPLEX",
            locations: [
                market("ECO Market"),
                { name: "Momentum", cost: { actions: [trashCost(2)] }, reward: {} },
                {
                    name: "Restricted Area",
                    cost: {},
                    reward: { actions: [{ actionId: LocationActionsEnum.DEAL, name: "deal" }] },
                    isRestrictedArea: true,
                },
                highCouncil(),
            ],
        },
        {
            id: DistrictIconsEnum.D3,
            name: "Streets",
            locations: [
                {
                    name: "Easy Job",
                    cost: {},
                    reward: { resources: [{ resourceId: ResourceEnum.Loot, amount: 1 }] },
                },
                {
                    name: "Bargain",
                    cost: { actions: [trashCost(2)] },
                    reward: { resources: [{ resourceId: ResourceEnum.Loot, amount: 2 }] },
                },
                { name: "Restricted Area", cost: {}, reward: {}, isRestrictedArea: true },
                highCouncil(),
            ],
        },
        {
            id: DistrictIconsEnum.D4,
            name: "AGI CTRL Z",
            locations: [
                highCouncil(),
                {
                    name: "Time is Gold",
                    cost: { resources: [{ resourceId: ResourceEnum.Loot, amount: 2 }] },
                    reward: {
                        actions: [{
                            actionId: LocationActionsEnum.DRAW,
                            name: "draw",
                            params: { selectionNumber: 2 },
                        }],
                    },
                },
                {
                    name: "Sword Master",
                    cost: { resources: [{ resourceId: ResourceEnum.Candy, amount: 4 }] },
                    reward: {
                        actions: [{ actionId: LocationActionsEnum.GET_SWORD_MASTER, name: "Sword Master" }],
                    },
                },
                { name: "Restricted Area", cost: {}, reward: {}, isRestrictedArea: true },
            ],
        },
    ],
});
