import { ResourceEnum } from "../enums";
import { PlayerGameState, ResourceBag } from "../types";

/**
 * Central resource math for every ResourceBag cost/reward.
 *
 * Candy, loot and victory points are plain numeric player fields; workers have
 * dual current/max semantics (maxNumberOfWorkers is the permanent stat,
 * currentNumberOfWorkers the per-round supply). All bag processing must go
 * through these helpers — `player[resourceId]` does not typecheck for Workers,
 * by design.
 */

/** Resource ids that are plain numeric fields on PlayerGameState. */
type DirectResource = Exclude<ResourceEnum, ResourceEnum.Workers>;

const isWorkers = (resourceId: ResourceEnum): boolean => resourceId === ResourceEnum.Workers;

export const getResourceAmount = (player: PlayerGameState, resourceId: ResourceEnum): number =>
    isWorkers(resourceId)
        ? player.maxNumberOfWorkers
        : player[resourceId as DirectResource];

/**
 * Apply reward bags. Workers raise max AND current — a gained worker is
 * usable in the same round (mirrors GET_SWORD_MASTER).
 */
export const addResources = (player: PlayerGameState, bags: ResourceBag[]): void => {
    for (const bag of bags) {
        if (isWorkers(bag.resourceId)) {
            player.maxNumberOfWorkers += bag.amount;
            player.currentNumberOfWorkers += bag.amount;
        } else {
            player[bag.resourceId as DirectResource] += bag.amount;
        }
    }
};

/**
 * Apply cost bags. Workers lower the permanent max and clamp current to it;
 * neither count goes below zero (affordability is gated separately by
 * canAffordResources).
 */
export const deductResources = (player: PlayerGameState, bags: ResourceBag[]): void => {
    for (const bag of bags) {
        if (isWorkers(bag.resourceId)) {
            player.maxNumberOfWorkers = Math.max(0, player.maxNumberOfWorkers - bag.amount);
            player.currentNumberOfWorkers = Math.max(
                0,
                Math.min(player.currentNumberOfWorkers, player.maxNumberOfWorkers)
            );
        } else {
            player[bag.resourceId as DirectResource] -= bag.amount;
        }
    }
};

/**
 * Affordability for cost bags. Worker costs must leave at least 1 permanent
 * worker — a player can never mod themselves out of the game.
 */
export const canAffordResources = (player: PlayerGameState, bags: ResourceBag[]): boolean =>
    bags.every(bag =>
        isWorkers(bag.resourceId)
            ? player.maxNumberOfWorkers - bag.amount >= 1
            : getResourceAmount(player, bag.resourceId) >= bag.amount
    );

/** Human-readable log label for a resource id. */
export const resourceLabel = (resourceId: ResourceEnum): string => {
    switch (resourceId) {
        case ResourceEnum.Candy: return "candy";
        case ResourceEnum.Loot: return "loot";
        case ResourceEnum.VictoryPoints: return "VP";
        case ResourceEnum.Workers: return "worker";
    }
};
