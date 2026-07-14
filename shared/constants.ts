export const GAME_NAME = "project-district";
export const INITIAL_NUMBER_OF_WORKERS = 2;

/** Cards a full hand holds (maintenance phase deals up to this many). */
export const HAND_SIZE = 5;

/**
 * Floor on a player's total collection (deck + discard + hand) after a
 * trash. Semantically distinct from HAND_SIZE even though both happen to be
 * 5 today — this guards against trashing a collection so small it could
 * never refill a hand again, not the hand size itself.
 */
export const MIN_COLLECTION_SIZE = 5;

/**
 * Sentinel value indicating no card is selected.
 * Intentionally undefined so that `!selectedCard` checks work correctly.
 * Use `hasSelectedCard(player)` helper for semantic clarity.
 */
export const NO_CARD_SELECTED: undefined = undefined;

/** Number of face-up cards visible in the market row at any time. */
export const MARKET_ROW_SIZE = 4;

/**
 * Seat colors — SINGLE source of truth for every player-color surface
 * (info-panel dots, log dots, lobby chips, presence/ranking text). Indexed by
 * seat id. Matches the board seating viewed from the human seat 0:
 *   0 red (human, bottom-left) · 1 violet (top-right) ·
 *   2 green (bottom-right)     · 3 yellow (top-left)
 * The worker sprite assets (client `tipitos/worker-*.png`) follow this order.
 */
export const PLAYER_SEAT_COLORS = ["#ef4444", "#a855f7", "#22c55e", "#eab308"] as const;

/** Hex color for a seat id; grey fallback for unknown ids. */
export const playerSeatColor = (playerID: string | number): string =>
    PLAYER_SEAT_COLORS[typeof playerID === "string" ? parseInt(playerID) : playerID] ?? "#888888";

/**
 * COUNTER-CLOCKWISE seating ring — turn order always runs counter-clockwise
 * around the table:
 *   0 red (bottom-left) → 2 green (bottom-right) → 1 violet (top-right) →
 *   3 yellow (top-left) → back to 0.
 * e.g. starting at violet: violet → yellow → red → green.
 * This array is the single source of the ring; keep it in sync with
 * PLAYER_SEAT_COLORS seating.
 */
export const SEAT_TURN_ORDER = ["0", "2", "1", "3"] as const;

/** The turn-order ring restricted to the seats actually in the match. */
export const seatRing = (numPlayers: number): string[] =>
    SEAT_TURN_ORDER.filter(s => parseInt(s) < numPlayers);

/** The seat that acts after `seat`, following the ring. */
export const nextSeat = (seat: string, numPlayers: number): string => {
    const ring = seatRing(numPlayers);
    const i = ring.indexOf(seat);
    return ring[(i + 1) % ring.length] ?? ring[0];
};
