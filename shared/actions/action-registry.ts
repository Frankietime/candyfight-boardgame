import { ActionInputSpec } from "./input-types";
import { ActionParams } from "./action-params";
import { ActionRequirement, Location, MetaGameState, PlayerGameState } from "../types";

/**
 * Action Definition - serializable metadata about an action
 * This is the "declaration" of what an action needs and does.
 */
export interface ActionDefinition<TParams extends ActionParams = ActionParams> {
  /** Unique identifier for this action */
  readonly id: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** What input this action requires from the user (serializable) */
  readonly inputSpec: ActionInputSpec;

  /** Requirements that must be met before action can be performed */
  readonly requirements?: ActionRequirement[];

  /** Whether this action can be undone */
  readonly undoable?: boolean;

  /** Tags for categorization and filtering */
  readonly tags?: readonly string[];
}

/**
 * Execution context passed to action handlers
 */
export interface ActionContext {
  readonly location?: Location;
  readonly sourceAction?: string;
}

/**
 * Action Handler - runtime execution logic (not serializable)
 * Separated from definition to keep game state serializable.
 */
export interface ActionHandler<TParams extends ActionParams = ActionParams> {
  /**
   * Validate that params are valid given current state.
   * Returns null if valid, error message string if invalid.
   */
  validate?: (
    params: TParams,
    state: MetaGameState,
    player: PlayerGameState,
    context?: ActionContext
  ) => string | null;

  /**
   * Execute the action, mutating game state.
   */
  execute: (
    params: TParams,
    state: MetaGameState,
    player: PlayerGameState,
    context?: ActionContext
  ) => void;
}

/**
 * Combined registration entry
 */
interface ActionRegistryEntry {
  definition: ActionDefinition;
  handler: ActionHandler;
}

/**
 * Global Action Registry
 *
 * Central registry for all action types. Actions register their
 * definitions (serializable metadata) and handlers (runtime logic) here.
 *
 * This enables:
 * - Decoupling between action definitions and UI
 * - Mod support via TypeScript module registration
 * - Type-safe action execution
 */
class ActionRegistryImpl {
  private entries = new Map<string, ActionRegistryEntry>();

  /**
   * Register a new action type.
   * Call this at module load time for core actions,
   * or from mod initialization for mod actions.
   */
  register<TParams extends ActionParams>(
    definition: ActionDefinition<TParams>,
    handler: ActionHandler<TParams>
  ): void {
    if (this.entries.has(definition.id)) {
      console.warn(`[ActionRegistry] Action "${definition.id}" already registered, overwriting`);
    }

    this.entries.set(definition.id, {
      definition,
      handler: handler as ActionHandler
    });
  }

  /**
   * Get action definition by ID (serializable metadata)
   */
  getDefinition(actionId: string): ActionDefinition | undefined {
    return this.entries.get(actionId)?.definition;
  }

  /**
   * Get action handler by ID (runtime execution)
   */
  getHandler(actionId: string): ActionHandler | undefined {
    return this.entries.get(actionId)?.handler;
  }

  /**
   * Get input specification for an action
   */
  getInputSpec(actionId: string): ActionInputSpec | undefined {
    return this.entries.get(actionId)?.definition.inputSpec;
  }

  /**
   * Check if action requires user input
   */
  requiresInput(actionId: string): boolean {
    const spec = this.getInputSpec(actionId);
    return spec !== undefined && spec.inputType !== 'none';
  }

  /**
   * Check if an action is registered
   */
  has(actionId: string): boolean {
    return this.entries.has(actionId);
  }

  /**
   * Get all registered action IDs
   */
  getAllActionIds(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Get actions by tag
   */
  getActionsByTag(tag: string): ActionDefinition[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.definition.tags?.includes(tag))
      .map(entry => entry.definition);
  }

  /**
   * Execute an action with validation
   */
  execute(
    actionId: string,
    params: ActionParams,
    state: MetaGameState,
    player: PlayerGameState,
    context?: ActionContext
  ): { success: boolean; error?: string } {
    const handler = this.getHandler(actionId);

    if (!handler) {
      return { success: false, error: `Unknown action: ${actionId}` };
    }

    // Validate if handler has validation
    if (handler.validate) {
      const error = handler.validate(params, state, player, context);
      if (error) {
        return { success: false, error };
      }
    }

    // Execute
    handler.execute(params, state, player, context);
    return { success: true };
  }
}

// Singleton instance
export const actionRegistry = new ActionRegistryImpl();
