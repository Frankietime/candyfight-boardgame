/**
 * Stable card factories for tutorial chapters.
 *
 * Chapters need known cards in known places, so these clone the real card
 * definitions (preserving their effects) and stamp deterministic ids.
 */
import { Card } from "../types";
import { DistrictIconsEnum } from "../enums";
import { getTierOneCards, getSignetCard, getMarketTierOneCards } from "../services/cardServices";

const TIER_ONE = getTierOneCards();
const MARKET = getMarketTierOneCards();

/** Single-district card (carries the addPresence effect) for the given district. */
export const districtCard = (district: DistrictIconsEnum, id: string): Card => ({
    ...TIER_ONE.find(c => c.districtIds.length === 1 && c.districtIds.includes(district))!,
    id,
});

/** Dual-district card covering both districts (carries addPresence). */
export const dualCard = (a: DistrictIconsEnum, b: DistrictIconsEnum, id: string): Card => ({
    ...MARKET.find(c => c.districtIds.includes(a) && c.districtIds.includes(b))!,
    id,
});

/** The Signet card (all districts) — playing it triggers the character ability. */
export const signetCard = (id = "tut-signet"): Card => ({
    ...getSignetCard(),
    id,
});

/** A neutral filler card used to pad hands (single-district, no special meaning here). */
export const fillerCard = (district: DistrictIconsEnum, id: string): Card =>
    districtCard(district, id);
