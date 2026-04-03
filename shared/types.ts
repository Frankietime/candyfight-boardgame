import { Ctx, DefaultPluginAPIs, PlayerID } from "boardgame.io";
import { CharacterEnum, DistrictIconsEnum, LocationActionsEnum, RequirementType, ResourceEnum } from "./enums";

export type MetaGameState = {
    G: GameState;
    ctx: Ctx;
    playerID?: PlayerID;
    random?: any;
    plugins?: DefaultPluginAPIs;
    events?: { endTurn?: () => void };
}

export interface GameState {
  players: Dictionary<PlayerGameState>;
  districts: District[];
  cardMarket: Card[];
  roundEndingCounter: number;
  gameEndingCounter: number;
  ranking: PlayerGameState[];
  /** Public view of all players for UI display */
  playersViewModel: PlayerViewModel[];
}

/**
 * Client-side game state after playerView filtering.
 *
 * Unlike GameState (server-side, full access):
 * - players: Mixed dictionary (current player = full, others = public view)
 * - ranking: Public view only
 *
 * Use isFullPlayerState() type guard to safely access full player data.
 */
export interface ClientGameState extends Omit<GameState, 'players' | 'ranking'> {
  players: Dictionary<PlayerPublicOrPrivate>;
  ranking: PlayerViewModel[];
}

/**
 * Helper type to get a player's public or private state.
 * After playerView filtering:
 * - Current player: PlayerGameState (full access)
 * - Other players: PlayerViewModel (public only)
 */
export type PlayerPublicOrPrivate = PlayerGameState | PlayerViewModel;

/**
 * Type guard to check if a player state is the full private state.
 */
export const isFullPlayerState = (player: PlayerPublicOrPrivate): player is PlayerGameState => {
    return 'hand' in player && Array.isArray(player.hand);
};

export type PlayerGameState = {
  id: string;
  characterId?: CharacterEnum;
  cardsInPlay?: Card[];
  hasPlayedCard: boolean;
  currentNumberOfWorkers: number;
  maxNumberOfWorkers: number;
  selectedCard?: Card;
  [ResourceEnum.Candy]: number;
  [ResourceEnum.Loot]: number;
  victoryPoints: number;
  deck: Card[];
  discardPile: Card[];
  trashPile: Card[];
  hand: Card[];
  hasRevealed: boolean;
 }

export type PlayerViewModel = {
  id: string;
  characterId?: CharacterEnum;
  hasRevealed: boolean,
  currentNumberOfWorkers: number;
  victoryPoints: number;
  deckLength: number;
  discardPile: Card[];
  trashPile: Card[];
  handLength: number;
  candy: number;
  loot: number;
}

export type PlayerState = { 
  playerID: string; 
  name: string; 
  matchID: string;  
  playerCredentials: string;
}

export type District = {
  id: DistrictIconsEnum;
  name: string;
  y: number;
  x: number;
  locations: Location[];
  presence: { [key: string]: PlayerPresence }
  combatWinnerId?: string;
}

export type PlayerPresence = {
  playerID: string;
  amount: number;
}

export type Location = {
  Id: string;
  districtId: string;
  name: string;
  cost: LocationCost;
  // evitar rewards que requieren elecciones de usuario por el momento
  // la interaccion es mas facil en el momento de pagar el coste (cuando todavia no se ejecuta la move)
  reward: LocationReward;
  isDisabled?: boolean;
  isSelected?: boolean;
  takenByPlayerID?: string;
  dominanceBy?: string[];
  isRestrictedArea?: boolean;
}

/**
 * Cost to enter a location.
 *
 * Use `resources` for simple numeric costs (loot, candy).
 * Use `actions` for complex costs requiring validation or user input (discard, trash).
 */
export type LocationCost = {
  districtIconIds: string[];
  /** Simple numeric resource costs - deducted directly from player */
  resources?: ResourceBag[];
  /** Complex action costs - executed via action registry, may require user input */
  actions?: CostAction[];
}

/**
 * A simple numeric resource amount.
 * Use for straightforward +/- operations on player resources.
 */
export type ResourceBag = {
  resourceId: ResourceEnum;
  amount: number
}

/**
 * Rewards granted when entering a location.
 *
 * Use `resources` for simple numeric rewards (loot, candy).
 * Use `actions` for complex rewards requiring game logic (draw, presence tokens).
 */
export type LocationReward = {
  /** Simple numeric resource rewards - added directly to player */
  resources?: ResourceBag[];
  /** Complex action rewards - executed via action registry */
  actions?: RewardAction[];
}

// Validation context for checking if an action can be performed
export type ValidationContext = {
  selectedCard?: Card;
  location?: Location;
}

// Base requirement - serializable data only (no functions)
export type ActionRequirement = {
  type: RequirementType;
  params: { count: number };
}

/**
 * Cost action - MUST be performed to enter location.
 * Use for complex costs that require validation or user input.
 * Executed via action registry.
 */
export type CostAction = {
  actionId: LocationActionsEnum;
  name: string;
  params?: any;
  requirements: ActionRequirement[];
}

/**
 * Reward action - Performed AFTER entering location or playing a card.
 * Use for complex rewards that require game logic.
 * Executed via action registry.
 */
export type RewardAction = {
  actionId: LocationActionsEnum;
  name: string;
  params?: any;
  location?: Location;
}

/**
 * A playable card in the game.
 *
 * Cards can provide both resources and actions when played:
 * - Use `primaryResources`/`secondaryResources` for simple numeric rewards
 * - Use `primaryEffects`/`secondaryEffects` for complex game logic
 */
export type Card = {
  id: string;
  name: string;
  districtIds: string[];

  /** Simple numeric resources granted when card is played */
  primaryResources?: ResourceBag[];
  /** Simple numeric resources for secondary/delayed effects */
  secondaryResources?: ResourceBag[];

  /** Complex action effects executed via registry when card is played */
  primaryEffects?: RewardAction[];
  /** Complex action effects for secondary/delayed execution */
  secondaryEffects?: RewardAction[];
}

// Utils
export type Dictionary<T> = Record<string, T>;