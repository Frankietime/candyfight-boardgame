import { INVALID_MOVE } from "boardgame.io/core";
import { Card, MetaGameState, PlayerGameState } from "../../types";
import { isPlayCardValid } from "../../game-helper";
import { getCurrentPlayer, takeFromHand } from "./helper";
import { log } from "../../common-methods";

export const selectCard = (player: PlayerGameState, selectedCard: Card) => {
    if (!isPlayCardValid(player, selectedCard.id))
        return INVALID_MOVE;
    player.selectedCard = selectedCard;
}

const doDraw = (player: PlayerGameState) => player.hand.push(player.deck.pop()!);

export const draw = (player: PlayerGameState, random: any, numberOfCards?: number) => {
    log("draw " + numberOfCards);
    if (player.deck.length == 0) {
        player.deck = rebuildDeck(player, random);
    }
    
    numberOfCards ? 
        Array.from({ length: numberOfCards })
            .forEach(c => {
                if (player.deck.length > 0) {
                    doDraw(player);
                } else {
                    rebuildDeck(player, random);
                    doDraw(player);
                }                
            })
            :
        doDraw(player);                       
    
}

// NOTE: getLoot removed - use resources[] array instead (see types.ts)

export const discard = (player: PlayerGameState, cards: Card[]): Card[] | string => {
    
    const discarded = takeFromHand(player, cards);
    
    return discarded == INVALID_MOVE ? INVALID_MOVE : player.discardPile = [...player.discardPile, ...discarded as Card[]];
}

export const trash = (player: PlayerGameState, cards: Card[]): Card[] | string => {

    if ((player.deck.length + player.discardPile.length + player.hand.length) <= 5)
        return INVALID_MOVE;
    
    const trashed = takeFromHand(player, cards);
    
    return trashed == INVALID_MOVE ? INVALID_MOVE : player.trashPile = [...player.trashPile, ...trashed as Card[]];
}

const rebuildDeck = (player: PlayerGameState, random: any): Card[] => {
    log("REBUILD DECK");
    return player.deck = random.Shuffle(player.discardPile).map(() => player.discardPile.pop());
}