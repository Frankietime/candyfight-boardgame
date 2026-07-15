import {
  ActionRequirement,
  Card,
  CostAction,
  Location,
  PlayerGameState,
  ValidationContext
} from "../../types";
import { LocationActionsEnum, RequirementType } from "../../enums";
import { canAffordResources } from "../resourceServices";

// Requirement data factory: Cards in hand (for discard/trash actions)
export const cardsInHandRequirement = (count: number): ActionRequirement => ({
  type: RequirementType.CARDS_IN_HAND,
  params: { count }
});

// Validate a single requirement
const validateRequirement = (
  req: ActionRequirement,
  player: PlayerGameState,
  context: ValidationContext
): boolean => {
  switch (req.type) {
    case RequirementType.CARDS_IN_HAND:
      // Exclude the selected card from the count (it's being played)
      const availableCards = player.hand.length - (context.selectedCard ? 1 : 0);
      return availableCards >= req.params.count;
    case RequirementType.RESOURCE:
      // Future: validate resource requirements
      return true;
    default:
      return true;
  }
};

// Check if player can pay ALL costs for a location
export const canPayLocationCosts = (
  player: PlayerGameState,
  location: Location,
  selectedCard?: Card
): boolean => {
  const context: ValidationContext = { selectedCard, location };

  // Check resource costs (candy/loot/VP/workers — central affordability rules)
  const hasResources = canAffordResources(player, location.cost.resources ?? []);

  // Check action costs
  const canPerformActions = location.cost.actions?.every(
    action => action.requirements.every(req => validateRequirement(req, player, context))
  ) ?? true;

  return hasResources && canPerformActions;
};

// Convenience builders for cost actions

export const discardCost = (count: number): CostAction => ({
  actionId: LocationActionsEnum.DISCARD,
  name: `discard ${count}`,
  params: { selectionNumber: count },
  requirements: [cardsInHandRequirement(count)]
});

export const trashCost = (count: number): CostAction => ({
  actionId: LocationActionsEnum.TRASH,
  name: `trash ${count}`,
  params: { selectionNumber: count },
  requirements: [cardsInHandRequirement(count)]
});
