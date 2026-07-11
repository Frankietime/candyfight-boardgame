import { CharacterEnum, LocationActionsEnum, ResourceEnum } from "../enums";
import { MetaGameState, PlayerGameState } from "../types";
import { ActionContext, actionRegistry } from "../actions/action-registry";

/**
 * Prints the chosen character's signet ability onto the player's Signet
 * card(s): card renderers display `effect.name`, so after this the card itself
 * says what the signet does (e.g. "Gain 2 candy + 1 extra presence…") instead
 * of the generic "Signet Trigger". Call when the character is selected.
 */
export const stampSignetAbility = (player: PlayerGameState): void => {
    if (!player.characterId) return;
    const description = characterDefinitions[player.characterId].signetAbilityDescription;
    [...player.deck, ...player.hand, ...player.discardPile].forEach(card => {
        card.primaryEffects?.forEach(effect => {
            if (effect.actionId === LocationActionsEnum.SIGNET_TRIGGER) {
                effect.name = description;
            }
        });
    });
};

export interface CharacterDefinition {
    id: CharacterEnum;
    name: string;
    description: string;
    signetAbilityDescription: string;
    executeSignetAbility: (
        state: MetaGameState,
        player: PlayerGameState,
        context?: ActionContext
    ) => void;
}

export const characterDefinitions: Record<CharacterEnum, CharacterDefinition> = {
    [CharacterEnum.ChillDudes]: {
        id: CharacterEnum.ChillDudes,
        name: "Chill Dudes",
        description: "They take it slow, but always come prepared.",
        signetAbilityDescription: "Draw 1 card + gain 1 loot",
        executeSignetAbility: (state, player) => {
            player[ResourceEnum.Loot] += 1;
            actionRegistry.execute(
                LocationActionsEnum.DRAW,
                { actionType: "draw", count: 1 },
                state,
                player
            );
        },
    },

    [CharacterEnum.Kawaiisis]: {
        id: CharacterEnum.Kawaiisis,
        name: "Kawaiisis",
        description: "Don't let the cute exterior fool you.",
        signetAbilityDescription: "Gain 2 candy + 1 extra presence in current district",
        executeSignetAbility: (state, player, context) => {
            player[ResourceEnum.Candy] += 2;
            actionRegistry.execute(
                LocationActionsEnum.ADD_PRESENCE_TOKEN,
                { actionType: "addPresenceToken" },
                state,
                player,
                context
            );
        },
    },

    [CharacterEnum.StreetWizards]: {
        id: CharacterEnum.StreetWizards,
        name: "Street Wizards",
        description: "They make loot appear from thin air.",
        signetAbilityDescription: "Gain 3 loot",
        executeSignetAbility: (_state, player) => {
            player[ResourceEnum.Loot] += 3;
        },
    },

    [CharacterEnum.TechBros]: {
        id: CharacterEnum.TechBros,
        name: "Tech Bros",
        description: "Always optimizing, always drawing.",
        signetAbilityDescription: "Draw 2 cards + gain 1 candy",
        executeSignetAbility: (state, player) => {
            player[ResourceEnum.Candy] += 1;
            actionRegistry.execute(
                LocationActionsEnum.DRAW,
                { actionType: "draw", count: 2 },
                state,
                player
            );
        },
    },
};
