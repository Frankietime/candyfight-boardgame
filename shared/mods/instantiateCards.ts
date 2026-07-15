import { DistrictIconsEnum, LocationActionsEnum } from "../enums";
import { Card } from "../types";
import { getBaseMod } from "./baseMod";
import { ModCard, ModDefinition, ModMarketTier } from "./types";

/**
 * Turns authored ModCards into runtime Card instances.
 *
 * Card ids MUST be unique per instance in a match (takeFromHand / discard /
 * trash / buy all findIndex by id; React keys too). Authored ids are unique
 * within a mod (enforced by the validator); suffixing per player / per tier /
 * per copy makes every instance id unique across the whole match.
 */

/** The automatic Signet card every player receives — not mod-editable. */
export const SIGNET_MOD_CARD: ModCard = {
    id: "signet",
    name: "Signet",
    districtIds: Object.values(DistrictIconsEnum),
    primaryEffects: [{ actionId: LocationActionsEnum.SIGNET_TRIGGER, name: "Signet Trigger" }],
};

/** One runtime instance of an authored card. Strips `copies`; no undefined keys. */
export const instantiateModCard = (modCard: ModCard, instanceSuffix: string): Card => {
    const { copies: _copies, ...card } = modCard;
    return {
        ...card,
        id: `${modCard.id}#${instanceSuffix}`,
        districtIds: [...(modCard.districtIds ?? [])],
    };
};

const expandCopies = (cards: ModCard[], suffixFor: (copy: number) => string): Card[] =>
    cards.flatMap(modCard =>
        Array.from({ length: Math.max(1, modCard.copies ?? 1) }, (_, i) =>
            instantiateModCard(modCard, suffixFor(i + 1))
        )
    );

/** The mod's decks with per-field fallback to the base cartridge. */
export const resolveDecks = (
    mod?: ModDefinition
): { baseDeck: ModCard[]; marketTiers: ModMarketTier[] } => {
    const base = getBaseMod().decks!;
    return {
        baseDeck: mod?.decks?.baseDeck?.length ? mod.decks.baseDeck : base.baseDeck!,
        marketTiers: mod?.decks?.marketTiers?.length ? mod.decks.marketTiers : base.marketTiers!,
    };
};

/** A player's starting deck: the mod's base deck + their automatic Signet. */
export const buildPlayerDeckFromMod = (mod: ModDefinition | undefined, playerId: string): Card[] => [
    ...expandCopies(resolveDecks(mod).baseDeck, copy => `p${playerId}.${copy}`),
    instantiateModCard(SIGNET_MOD_CARD, `p${playerId}`),
];

/** One unshuffled pile per market tier (setup shuffles them). */
export const buildMarketsFromMod = (mod: ModDefinition | undefined): Record<string, Card[]> =>
    Object.fromEntries(
        resolveDecks(mod).marketTiers.map(tier => [
            tier.id,
            expandCopies(tier.cards, copy => `${tier.id}.${copy}`),
        ])
    );
