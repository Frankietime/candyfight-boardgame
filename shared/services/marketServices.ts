import { DEFAULT_MARKET_TIER, MARKET_ROW_SIZE } from "../constants";
import { Card, GameState, Location } from "../types";

/**
 * Per-tier market resolution — the ONLY way to read a market pile/row.
 * Locations without an explicit tier sell from the default tier (base game
 * and phase-1 mod compatibility).
 */

export const marketTierIdFor = (location?: Pick<Location, "marketTierId">): string =>
    location?.marketTierId ?? DEFAULT_MARKET_TIER;

export const marketPileFor = (
    G: Pick<GameState, "markets">,
    location?: Pick<Location, "marketTierId">
): Card[] => G.markets[marketTierIdFor(location)] ?? [];

/** The face-up row (first MARKET_ROW_SIZE cards) of the location's tier. */
export const marketRowFor = (
    G: Pick<GameState, "markets">,
    location?: Pick<Location, "marketTierId">
): Card[] => marketPileFor(G, location).slice(0, MARKET_ROW_SIZE);
