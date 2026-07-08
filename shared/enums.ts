export enum DistrictIconsEnum {
    D1 = "LOC1",
    D2 = "LOC2",
    D3 = "LOC3",
    D4 = "LOC4",
}

export enum ResourceEnum {
    Candy = "candy",
    Loot = "loot",
}

export enum LocationActionsEnum {
    DRAW = "draw",
    ADD_PRESENCE_TOKEN = "addPresenceToken",
    GET_LOOT = "getLoot",
    GET_CANDY = "getCandy",
    STRANGE_CANDY_PUZZLE = "strangeCandyPuzzle",
    COOLDOWN = "cooldown",
    SIGNET_TRIGGER = "signetTrigger",
    ADD_REPAIR_TOKEN = "addRepairToken",
    ADVANCE_TRACKER = "advanceTracker",
    GET_SWORD_MASTER = "getSwordMaster",
    TRASH = "trash",
    BUY_CARD = "buyCard",
    DISCARD = "discard",
    SELECT_AND_DISCARD = "selectAndDiscard",
    DEAL = "deal",
}

export enum RequirementType {
    CARDS_IN_HAND = "cardsInHand",
    RESOURCE = "resource",
}

// Seat colors match the board seating (viewed from the human seat 0):
// 0 red (human, bottom-left) · 1 violet (top-right) · 2 green (bottom-right) · 3 yellow (top-left)
export enum PlayerColorsEnum {
    "red" = 0,
    "violet" = 1,
    "green" = 2,
    "yellow" = 3,
}

export enum CharacterEnum {
    ChillDudes = "chilldudes",
    Kawaiisis = "kawaiisis",
    StreetWizards = "streetwizards",
    TechBros = "techbros",
}