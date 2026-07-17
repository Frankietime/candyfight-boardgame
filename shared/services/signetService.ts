import { LocationActionsEnum } from "../enums";
import { MetaGameState, PlayerGameState } from "../types";
import { ModCharacter, ModCharacterSignet } from "../mods/types";
import { ActionContext, actionRegistry } from "../actions/action-registry";
import { addResources } from "./resourceServices";

/**
 * Character signets — data-driven (mod-resolved `G.characters`), replacing
 * the old hardcoded `characterDefinitions`/`executeSignetAbility` TS code.
 * A signet is an input-free effect bag, same shape as a card's primary
 * effects, executed the same way (addResources + actionRegistry.execute).
 */

const describeSignet = (signet: ModCharacterSignet): string =>
    [
        ...(signet.resources?.map(r => `+${r.amount} ${r.resourceId}`) ?? []),
        ...(signet.actions?.map(a => a.name) ?? []),
    ].join(", ");

/**
 * Prints the chosen character's signet ability onto the player's Signet
 * card(s): card renderers display `effect.name`, so after this the card
 * itself says what the signet does. Call when the character is selected.
 */
export const stampSignetAbility = (characters: ModCharacter[], player: PlayerGameState): void => {
    if (!player.characterId) return;
    const character = characters.find(c => c.id === player.characterId);
    if (!character) return;
    const description = describeSignet(character.signet);
    [...player.deck, ...player.hand, ...player.discardPile].forEach(card => {
        card.primaryEffects?.forEach(effect => {
            if (effect.actionId === LocationActionsEnum.SIGNET_TRIGGER) {
                effect.name = description;
            }
        });
    });
};

/** Executes the acting player's character's signet ability (SIGNET_TRIGGER handler). */
export const executeCharacterSignet = (
    state: MetaGameState,
    player: PlayerGameState,
    context?: ActionContext
): void => {
    if (!player.characterId) return;
    const character = state.G.characters.find(c => c.id === player.characterId);
    if (!character) return;
    if (character.signet.resources?.length) {
        addResources(player, character.signet.resources);
    }
    character.signet.actions?.forEach(action => {
        actionRegistry.execute(action.actionId, action.params ?? {}, state, player, context);
    });
};
