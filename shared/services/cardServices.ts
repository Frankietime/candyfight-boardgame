import { Card } from "../types";
import { LocationActionsEnum } from "../enums";
import { getBaseMod } from "../mods/baseMod";
import { ModCard } from "../mods/types";
import { instantiateModCard, SIGNET_MOD_CARD } from "../mods/instantiateCards";
import { getPuzzleRequirement } from "../mods/revealEffects";
import { PuzzleRequirementSpec } from "./puzzleService";
// NOTE: imports go straight to baseMod/instantiateCards/revealEffects (not
// the mods barrel) so this module never pulls in validateMod → actions →
// core-actions.

/**
 * Legacy card factories — now a thin derivation of the base cartridge's
 * decks (shared/mods/baseMod.ts is the single source of card content).
 * Each call mints fresh instances with process-unique ids, preserving the
 * original semantics for tests and the tutorial.
 */

let _cardInstanceCounter = 0;

const instantiate = (cards: ModCard[]): Card[] =>
    cards.map(card => instantiateModCard(card, String(++_cardInstanceCounter)));

const baseDeck = () => getBaseMod().decks!.baseDeck!;
const tierOneMarket = () => getBaseMod().decks!.marketTiers![0].cards;

/** A player's full starting deck: signet + the base cartridge's deck. */
export const getInitialDeck = (): Card[] => [
    getSignetCard(),
    ...instantiate(baseDeck()),
];

/** The 4 single-district cards of the base deck. */
export const getTierOneCards = (): Card[] =>
    instantiate(baseDeck().filter(c => c.districtIds.length === 1));

/** The reveal-carrying cards of the base deck (pairs + Puzzle). */
export const getTierTwoCards = (): Card[] =>
    instantiate(baseDeck().filter(c => c.districtIds.length > 1));

/** The base game's tier-1 market: the 12 ordered district pairs. */
export const getMarketTierOneCards = (): Card[] => instantiate(tierOneMarket());

export const getDistrictCard = (districtIds: string[]): Card => {
    const districtId = districtIds.join("-");

    return {
        id: `${districtId}-${++_cardInstanceCounter}`,
        districtIds,
        name: districtId,
    };
};

export const getSignetCard = (): Card =>
    instantiateModCard(SIGNET_MOD_CARD, String(++_cardInstanceCounter));

export interface CardEffectText {
    /** Comma-joined primary resources + effect names ("Play" band). */
    playText: string;
    /** Comma-joined secondary resources + effect names, excluding the
     *  Puzzle (it prints its own icon combination, never its name). */
    revealText: string;
    /** Whether the card carries the Puzzle reveal effect. */
    hasPuzzle: boolean;
    /** The card's own configured icon/wildcard requirement, when hasPuzzle. */
    puzzleRequirement?: PuzzleRequirementSpec;
}

/**
 * Formats a card's printed effect text — shared by CardComponent (hand/board)
 * and CardMini (market/log/minis) so the two card renderers can't drift.
 */
export const getCardEffectText = (card: Card): CardEffectText => {
    const puzzleRequirement = getPuzzleRequirement(card);
    return {
        playText: [
            ...(card.primaryResources?.map(r => `+${r.amount} ${r.resourceId}`) ?? []),
            ...(card.primaryEffects?.map(e => e.name) ?? []),
        ].join(", "),
        revealText: [
            ...(card.secondaryResources?.map(r => `+${r.amount} ${r.resourceId}`) ?? []),
            ...(card.secondaryEffects
                ?.filter(e => e.actionId !== LocationActionsEnum.STRANGE_CANDY_PUZZLE)
                .map(e => e.name) ?? []),
        ].join(", "),
        hasPuzzle: !!puzzleRequirement,
        puzzleRequirement,
    };
};
