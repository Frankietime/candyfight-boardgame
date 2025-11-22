import { INVALID_MOVE } from "boardgame.io/core";
import { Card, PlayerGameState } from "../../types";
import { isPlayCardValid } from "../validation/Validator";
import { takeFromHand } from "./helper";
import { log } from "../../common-methods";

export const selectCard = (player: PlayerGameState, selectedCard: Card) => {
    if (!isPlayCardValid(player, selectedCard.id))
        return INVALID_MOVE;
    player.selectedCard = selectedCard;
}

const doDraw = (player: PlayerGameState) => player.hand.push(player.deck.pop()!);

const rebuildDeck = (player: PlayerGameState, random: any): Card[] => {
    log("REBUILD DECK");
    return player.deck = random.Shuffle(player.discardPile).map(() => player.discardPile.pop());
}

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

export const getLoot = (player: PlayerGameState) => {
    player.loot = player.loot + 1;
}

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

export const buyCard = (player: PlayerGameState, cardMarket: Card[], cardId: string): string | void => {
    const cardIndex = cardMarket.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return INVALID_MOVE;

    const card = cardMarket[cardIndex];

    // Check resources
    if (card.cost) {
        for (const cost of card.cost) {
            if (player[cost.resourceId] < cost.amount) return INVALID_MOVE;
        }
        // Deduct resources
        card.cost.forEach(cost => {
            player[cost.resourceId] -= cost.amount;
        });
    }

    player.discardPile.push(card);
    cardMarket.splice(cardIndex, 1);
}

export const advanceTracker = (player: PlayerGameState) => {
    // TODO: Implement tracker logic
    log("advanceTracker not implemented");
}

export const addRepairToken = (player: PlayerGameState) => {
    // TODO: Implement repair token logic
    log("addRepairToken not implemented");
}

export const cooldown = (player: PlayerGameState) => {
    // TODO: Implement cooldown logic
    log("cooldown not implemented");
}

export const deal = (player: PlayerGameState) => {
    // TODO: Implement deal logic
    log("deal not implemented");
}

export const signetTrigger = (player: PlayerGameState) => {
    // TODO: Implement signet trigger logic
    log("signetTrigger not implemented");
}