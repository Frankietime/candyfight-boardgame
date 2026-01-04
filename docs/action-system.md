# Decoupled Action Input System

## Overview

The Action Input System provides a modular, type-safe architecture for handling game actions that require user input. It decouples action definitions from UI components, enabling extensibility for game mods and ensuring all game state remains JSON-serializable for boardgame.io compatibility.

---

## Problem Statement

The previous implementation had several issues:

### 1. Tight UI-Action Coupling
```typescript
// OLD: BoardComponent.tsx hardcoded action checks
const action = selectedLocation.cost.actions?.find(
  a => a.actionId == LocationActionsEnum.DISCARD || a.actionId == LocationActionsEnum.TRASH
);
```
Adding new actions required modifying multiple files across the codebase.

### 2. Untyped Parameters
```typescript
// OLD: No type safety for action params
export type CostAction = {
  actionId: LocationActionsEnum;
  params?: any;  // No type safety
}
```

### 3. Non-Serializable State
```typescript
// OLD: Functions in game state broke boardgame.io
export type ActionRequirement = {
  type: RequirementType;
  validate: (player, context) => boolean;  // NOT JSON-serializable!
}
```

### 4. No Input Metadata
Actions didn't declare what input they needed - the UI had to "know" which actions required card selection, resource selection, etc.

### 5. Difficult Move Pre-calculation
Without structured input specifications, calculating available moves for AI or UI highlighting required duplicating validation logic.

---

## Design Goals

1. **Decoupled Layers** - Actions declare WHAT input they need, not HOW to collect it
2. **Type Safety** - Discriminated unions for params, no `any` types
3. **Registry Pattern** - Actions and UI handlers register themselves
4. **Mod Support** - TypeScript modules can register new actions/locations
5. **Serializable State** - All game state must be JSON-serializable

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SHARED LAYER                             │
│                    (Server + Client)                            │
├─────────────────────────────────────────────────────────────────┤
│  ActionInputSpec (data-only)     ActionParams (typed union)     │
│  ├─ cardSelection                ├─ DiscardActionParams         │
│  ├─ resourceSelection            ├─ DrawActionParams            │
│  ├─ locationSelection            ├─ TrashActionParams           │
│  ├─ confirmation                 ├─ AddPresenceTokenParams      │
│  ├─ choice                       └─ ... (all action types)      │
│  └─ none                                                        │
├─────────────────────────────────────────────────────────────────┤
│  ActionRegistry                  ActionDefinition               │
│  ├─ register(def, handler)       ├─ id: string                  │
│  ├─ getDefinition(id)            ├─ displayName: string         │
│  ├─ getHandler(id)               ├─ inputSpec: ActionInputSpec  │
│  ├─ getInputSpec(id)             ├─ requirements?: []           │
│  ├─ requiresInput(id)            └─ tags?: string[]             │
│  └─ execute(id, params, ...)                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ References by ID (string)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  InputHandlerRegistry            ActionOrchestrator             │
│  ├─ register(type, Component)    ├─ requestActionInput()        │
│  ├─ getHandler(type)             ├─ cancelRequest()             │
│  └─ hasHandler(type)             └─ pendingRequest state        │
├─────────────────────────────────────────────────────────────────┤
│  CardSelectionHandler            (Future handlers)              │
│  ├─ Renders card picker UI       ├─ ResourceSelectionHandler    │
│  ├─ Filters by inputSpec         ├─ LocationSelectionHandler    │
│  └─ Returns CardSelectionResult  └─ ConfirmationHandler         │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
shared/
├── actions/
│   ├── index.ts              # Module exports
│   ├── input-types.ts        # ActionInputSpec discriminated union
│   ├── action-params.ts      # ActionParams discriminated union
│   ├── action-registry.ts    # ActionRegistry + ActionDefinition/Handler
│   └── core-actions.ts       # Registration of built-in actions

client/src/
├── actions/
│   ├── index.ts              # Client module exports
│   ├── input-handlers.ts     # InputHandlerRegistry
│   └── action-orchestrator.tsx  # Orchestrator hook + renderer
└── components/
    └── input-handlers/
        └── CardSelectionHandler.tsx  # Card selection UI
```

---

## Key Types

### ActionInputSpec (`shared/actions/input-types.ts`)

Declares WHAT input an action needs. Data-only, JSON-serializable.

```typescript
type ActionInputSpec =
  | CardSelectionInputSpec
  | ResourceSelectionInputSpec
  | LocationSelectionInputSpec
  | ConfirmationInputSpec
  | ChoiceInputSpec
  | NoInputSpec;

interface CardSelectionInputSpec {
  readonly inputType: 'cardSelection';
  readonly source: 'hand' | 'discard' | 'deck' | 'market';
  readonly minCount: number;
  readonly maxCount: number;
  readonly filter?: CardFilter;
}

interface CardFilter {
  readonly districtIds?: string[];
  readonly excludeCardIds?: string[];
  readonly excludePlayedCard?: boolean;
}
```

### ActionParams (`shared/actions/action-params.ts`)

Type-safe discriminated union for action parameters.

```typescript
type ActionParams =
  | DrawActionParams
  | DiscardActionParams
  | TrashActionParams
  | BuyCardActionParams
  | AddPresenceTokenParams
  | GetLootParams
  // ... etc

interface DiscardActionParams {
  readonly actionType: 'discard';
  readonly cardIds: string[];
}

// Type guards
function isDiscardParams(params: ActionParams): params is DiscardActionParams;

// Factory helpers
const createParams = {
  discard: (cardIds: string[]): DiscardActionParams => ({ actionType: 'discard', cardIds }),
  draw: (count: number): DrawActionParams => ({ actionType: 'draw', count }),
};
```

### ActionDefinition & ActionHandler (`shared/actions/action-registry.ts`)

Separation of serializable metadata from runtime execution.

```typescript
// Serializable - can be stored in game state
interface ActionDefinition<TParams extends ActionParams = ActionParams> {
  readonly id: string;
  readonly displayName: string;
  readonly inputSpec: ActionInputSpec;
  readonly requirements?: ActionRequirement[];
  readonly undoable?: boolean;
  readonly tags?: readonly string[];
}

// Runtime only - NOT stored in game state
interface ActionHandler<TParams extends ActionParams = ActionParams> {
  validate?: (params, state, player, context) => string | null;
  execute: (params, state, player, context) => void;
}
```

### ActionRegistry (`shared/actions/action-registry.ts`)

Central registry singleton for action lookup.

```typescript
class ActionRegistryImpl {
  register<TParams>(definition: ActionDefinition<TParams>, handler: ActionHandler<TParams>): void;
  getDefinition(actionId: string): ActionDefinition | undefined;
  getHandler(actionId: string): ActionHandler | undefined;
  getInputSpec(actionId: string): ActionInputSpec | undefined;
  requiresInput(actionId: string): boolean;
  execute(actionId, params, state, player, context): { success: boolean; error?: string };
}

export const actionRegistry = new ActionRegistryImpl();
```

---

## Signal Flow

### Complete Flow: User Selects Location with DISCARD Cost

```
┌─────────────────┐
│  1. User clicks │
│    location     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  2. BoardComponent.onLocationSelect()   │
│     - Finds cost action (DISCARD)       │
│     - Checks if input needed            │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  3. actionOrchestrator.requestActionInput()
│     - Looks up ActionDefinition         │
│     - Gets inputSpec from registry      │
│     - Sets pendingRequest state         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  4. ActionOrchestratorRenderer          │
│     - Reads pendingRequest              │
│     - Gets handler from InputHandlerRegistry
│     - Renders CardSelectionHandler      │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  5. CardSelectionHandler                │
│     - Filters cards by inputSpec        │
│     - User selects cards                │
│     - Calls onComplete(CardSelectionResult)
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  6. ActionOrchestrator.onComplete()     │
│     - Converts result to ActionParams   │
│     - Calls original callback           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  7. BoardComponent callback             │
│     - Extracts cardIds from params      │
│     - Calls moves.placeWorker()         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  8. Game.ts placeWorker move            │
│     - Validates placement               │
│     - Executes cost actions             │
│     - Executes reward actions           │
└─────────────────────────────────────────┘
```

### Sequence Diagram

```
User        BoardComponent    ActionOrchestrator    Registry    CardSelectionHandler
  │              │                    │                │                │
  │──click──────►│                    │                │                │
  │              │                    │                │                │
  │              │──requestActionInput('discard')─────►│                │
  │              │                    │                │                │
  │              │                    │◄──getInputSpec─┤                │
  │              │                    │   {inputType:  │                │
  │              │                    │    'cardSelection',...}        │
  │              │                    │                │                │
  │              │◄──setPendingRequest│                │                │
  │              │                    │                │                │
  │              │════renders═════════════════════════════════════════►│
  │              │                    │                │                │
  │◄─────────────────────────────card picker UI───────────────────────│
  │              │                    │                │                │
  │──select cards────────────────────────────────────────────────────►│
  │              │                    │                │                │
  │              │                    │◄──onComplete({cardIds})────────│
  │              │                    │                │                │
  │              │◄──callback(params)─┤                │                │
  │              │                    │                │                │
  │              │──moves.placeWorker(...)             │                │
  │              │                    │                │                │
```

---

## How It Resolves Previous Issues

### 1. Pre-calculating Available Moves

**Before:** Had to duplicate validation logic in UI and game logic.

**After:** Query the registry for any action's requirements:

```typescript
// Check if player can perform an action
const definition = actionRegistry.getDefinition('discard');
const inputSpec = definition?.inputSpec;

if (inputSpec?.inputType === 'cardSelection') {
  const spec = inputSpec as CardSelectionInputSpec;
  const availableCards = player.hand.filter(c => {
    // Apply filters from spec
    if (spec.filter?.excludePlayedCard && c.id === playedCardId) return false;
    if (spec.filter?.districtIds && !c.districtIds.some(d => spec.filter!.districtIds!.includes(d))) return false;
    return true;
  });

  const canPerform = availableCards.length >= spec.minCount;
}
```

### 2. Decoupled UI from Actions

**Before:** BoardComponent checked for specific action IDs:
```typescript
// OLD - tightly coupled
if (action.actionId == LocationActionsEnum.DISCARD || action.actionId == LocationActionsEnum.TRASH) {
  // show card selection modal
}
```

**After:** UI asks registry if action needs input:
```typescript
// NEW - decoupled
if (actionOrchestrator.actionRequiresInput(action.actionId)) {
  actionOrchestrator.requestActionInput(action.actionId, { ... });
}
```

### 3. Type-Safe Parameters

**Before:** `params?: any` everywhere.

**After:** Discriminated unions with type guards:
```typescript
function handleParams(params: ActionParams) {
  if (isDiscardParams(params)) {
    // TypeScript knows params.cardIds exists
    console.log(params.cardIds);
  }
}
```

### 4. JSON-Serializable State

**Before:** Functions in ActionRequirement broke serialization.

**After:** Requirements are data-only:
```typescript
// Serializable requirement data
type ActionRequirement = {
  type: RequirementType;
  params: { count: number };
}

// Validation logic is separate (not stored in state)
function validateRequirement(req: ActionRequirement, player: PlayerGameState): boolean {
  switch (req.type) {
    case RequirementType.CARDS_IN_HAND:
      return player.hand.length >= req.params.count;
  }
}
```

### 5. Easy Action Extension

**Before:** Adding a new action required changes in 3+ files.

**After:** Register once, works everywhere:
```typescript
// In a mod or new feature file
const myActionDefinition: ActionDefinition = {
  id: 'myNewAction',
  displayName: 'My New Action',
  inputSpec: {
    inputType: 'cardSelection',
    source: 'hand',
    minCount: 1,
    maxCount: 3,
  },
  tags: ['mod', 'cards'],
};

const myActionHandler: ActionHandler = {
  validate: (params, state, player) => {
    // Custom validation
    return null; // or error message
  },
  execute: (params, state, player) => {
    // Custom execution
  },
};

actionRegistry.register(myActionDefinition, myActionHandler);
```

---

## Adding New Actions

### Step 1: Define Params Type (`action-params.ts`)

```typescript
export interface MyActionParams extends BaseActionParams {
  readonly actionType: 'myAction';
  readonly targetId: string;
  readonly amount: number;
}

// Add to union
export type ActionParams =
  | ...
  | MyActionParams;

// Add type guard
export function isMyActionParams(params: ActionParams): params is MyActionParams {
  return params.actionType === 'myAction';
}

// Add factory
export const createParams = {
  ...
  myAction: (targetId: string, amount: number): MyActionParams =>
    ({ actionType: 'myAction', targetId, amount }),
};
```

### Step 2: Register Action (`core-actions.ts` or mod file)

```typescript
const myActionDefinition: ActionDefinition<MyActionParams> = {
  id: 'myAction',
  displayName: 'My Action',
  inputSpec: {
    inputType: 'resourceSelection',
    resourceTypes: [ResourceEnum.Candy, ResourceEnum.Loot],
    minAmount: 1,
    maxAmount: 5,
  },
};

const myActionHandler: ActionHandler<MyActionParams> = {
  validate: (params, state, player) => {
    if (params.amount > player.candy) {
      return 'Not enough candy';
    }
    return null;
  },
  execute: (params, state, player) => {
    player.candy -= params.amount;
    // ... other effects
  },
};

actionRegistry.register(myActionDefinition, myActionHandler);
```

### Step 3: Add Input Handler (if new input type)

If your action uses a new input type not yet supported:

```typescript
// client/src/components/input-handlers/ResourceSelectionHandler.tsx
export function ResourceSelectionHandler({ inputSpec, player, onComplete, onCancel }: InputHandlerProps<ResourceSelectionResult>) {
  // Render resource selection UI
  // Call onComplete({ resources: [...] }) when done
}

// Register with input handler registry
inputHandlerRegistry.register('resourceSelection', ResourceSelectionHandler);
```

---

## Future: Mod Support (Phase 6)

The architecture is designed to support TypeScript-based mods:

```typescript
// mods/my-expansion/index.ts
import { actionRegistry } from '@candyfight/shared/actions';
import { modRegistry } from '@candyfight/shared/mods';

// Register mod metadata
modRegistry.register({
  id: 'my-expansion',
  name: 'My Expansion',
  version: '1.0.0',
});

// Register new actions
actionRegistry.register(newActionDefinition, newActionHandler);

// Register new locations (future)
locationRegistry.register(newLocations);
```

---

## Migration Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Type foundation (input-types.ts, action-params.ts) | Complete |
| 2 | Registry infrastructure (action-registry.ts, core-actions.ts) | Complete |
| 3 | Client input system (handlers, orchestrator) | Complete |
| 4 | DISCARD/TRASH integration | Complete |
| 5 | Complete migration (remove legacy modal) | Pending Review |
| 6 | Mod support API | Future |

---

## Related Files

- `shared/types.ts` - Core game types (ActionRequirement, CostAction, RewardAction)
- `shared/enums.ts` - LocationActionsEnum, RequirementType
- `shared/services/actions/requirements.ts` - Requirement validation logic
- `shared/Game.ts` - boardgame.io game definition
- `client/src/components/board-component/BoardComponent.tsx` - Main game UI
