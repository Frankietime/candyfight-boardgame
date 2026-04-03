export const GAME_NAME = "project-district";
export const INITIAL_NUMBER_OF_WORKERS = 2;

/**
 * Sentinel value indicating no card is selected.
 * Intentionally undefined so that `!selectedCard` checks work correctly.
 * Use `hasSelectedCard(player)` helper for semantic clarity.
 */
export const NO_CARD_SELECTED: undefined = undefined;

/** Number of face-up cards visible in the market row at any time. */
export const MARKET_ROW_SIZE = 4;
