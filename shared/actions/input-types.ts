import { ResourceEnum } from "../enums";

/**
 * Action Input Specifications
 *
 * These are data-only descriptors that declare WHAT input an action needs.
 * They must be JSON-serializable (no functions) for boardgame.io.
 * The UI layer decides HOW to collect this input.
 */

// Base interface for all input specifications
export interface BaseInputSpec {
  readonly inputType: string;
  readonly label?: string;
  readonly required?: boolean;
}

// Card selection input - player picks cards from a source
export interface CardSelectionInputSpec extends BaseInputSpec {
  readonly inputType: 'cardSelection';
  readonly source: 'hand' | 'discard' | 'deck' | 'market';
  readonly minCount: number;
  readonly maxCount: number;
  readonly filter?: CardFilter;
}

// Serializable card filter criteria (no functions)
export interface CardFilter {
  readonly districtIds?: string[];
  readonly excludeCardIds?: string[];
  readonly excludePlayedCard?: boolean;
}

// Resource selection input
export interface ResourceSelectionInputSpec extends BaseInputSpec {
  readonly inputType: 'resourceSelection';
  readonly resourceTypes: ResourceEnum[];
  readonly minAmount: number;
  readonly maxAmount: number;
}

// Location selection input
export interface LocationSelectionInputSpec extends BaseInputSpec {
  readonly inputType: 'locationSelection';
  readonly districtFilter?: string[];
  readonly excludeTaken?: boolean;
}

// Simple confirmation (no data collected)
export interface ConfirmationInputSpec extends BaseInputSpec {
  readonly inputType: 'confirmation';
  readonly message: string;
}

// Choice from predefined options
export interface ChoiceInputSpec extends BaseInputSpec {
  readonly inputType: 'choice';
  readonly options: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly description?: string;
  }>;
}

// No input required (automatic actions)
export interface NoInputSpec extends BaseInputSpec {
  readonly inputType: 'none';
}

// Union of all input specifications
export type ActionInputSpec =
  | CardSelectionInputSpec
  | ResourceSelectionInputSpec
  | LocationSelectionInputSpec
  | ConfirmationInputSpec
  | ChoiceInputSpec
  | NoInputSpec;

// Type guards
export function isCardSelectionSpec(spec: ActionInputSpec): spec is CardSelectionInputSpec {
  return spec.inputType === 'cardSelection';
}

export function isResourceSelectionSpec(spec: ActionInputSpec): spec is ResourceSelectionInputSpec {
  return spec.inputType === 'resourceSelection';
}

export function isNoInputSpec(spec: ActionInputSpec): spec is NoInputSpec {
  return spec.inputType === 'none';
}

export function requiresUserInput(spec: ActionInputSpec): boolean {
  return spec.inputType !== 'none';
}
