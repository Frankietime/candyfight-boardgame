import { RequirementType, ResourceEnum } from "../enums";
import { actionRegistry } from "../actions";

/**
 * Low-level payload validators shared by ModDefinition and DeckSetDefinition
 * validation (locations, cards — both carry cost/reward-shaped effect bags).
 */

export const NAME_MAX_LENGTH = 40;
export const AMOUNT_MAX = 99;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export const isValidName = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0 && value.length <= NAME_MAX_LENGTH;

export const isValidAmount = (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= AMOUNT_MAX;

/** Validates a `{ resources?, actions? }` bag (a location's cost/reward, or a card's play/reveal payload). */
export const validateEffectBag = (bag: unknown, label: string, isCost: boolean, errs: string[]): void => {
    const knownActionIds = new Set<string>(actionRegistry.getAllActionIds());
    const knownResourceIds = new Set<string>(Object.values(ResourceEnum));
    const knownRequirementTypes = new Set<string>(Object.values(RequirementType));

    if (!isRecord(bag)) {
        errs.push(`${label} must be an object`);
        return;
    }
    if (bag.resources !== undefined) {
        if (!Array.isArray(bag.resources)) {
            errs.push(`${label}.resources must be an array`);
        } else {
            bag.resources.forEach((res: unknown, k: number) => {
                if (!isRecord(res) || !knownResourceIds.has(res.resourceId as string)) {
                    errs.push(`${label}.resources[${k}].resourceId must be one of: ${[...knownResourceIds].join(", ")}`);
                    return;
                }
                if (!isValidAmount(res.amount)) {
                    errs.push(`${label}.resources[${k}].amount must be an integer between 0 and ${AMOUNT_MAX}`);
                }
            });
        }
    }
    if (bag.actions !== undefined) {
        if (!Array.isArray(bag.actions)) {
            errs.push(`${label}.actions must be an array`);
        } else {
            bag.actions.forEach((action: unknown, k: number) => {
                const actionLabel = `${label}.actions[${k}]`;
                if (!isRecord(action) || !knownActionIds.has(action.actionId as string)) {
                    errs.push(`${actionLabel}.actionId must be a registered action`);
                    return;
                }
                if (typeof action.name !== "string" || action.name.length === 0) {
                    errs.push(`${actionLabel}.name must be a non-empty string`);
                }
                if (isCost) {
                    if (!Array.isArray(action.requirements)) {
                        errs.push(`${actionLabel}.requirements must be an array (cost actions)`);
                    } else {
                        action.requirements.forEach((req: unknown, r: number) => {
                            if (!isRecord(req) || !knownRequirementTypes.has(req.type as string)) {
                                errs.push(`${actionLabel}.requirements[${r}].type must be one of: ${[...knownRequirementTypes].join(", ")}`);
                            }
                        });
                    }
                }
            });
        }
    }
};
