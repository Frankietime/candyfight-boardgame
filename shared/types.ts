import { Ctx, DefaultPluginAPIs, PlayerID } from "boardgame.io";
import { DistrictIconsEnum, ResourceEnum } from "./enums";

export type MetaGameState = {
    G: GameState;
    ctx: Ctx;
    playerID?: PlayerID;
    random?: any;
    plugins?: DefaultPluginAPIs;
}

export interface GameState {
  players: Dictionary<PlayerGameState>;
  playersViewModel: PlayerViewModel[];
  districts: District[];
  cardMarket: Card[];
  roundEndingCounter: number;
  gameEndingCounter: number;
  ranking: PlayerGameState[];
}

export type PlayerGameState = {
  id: string;
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

export type LocationCost = {
  districtIconIds: string[];
  resources?: ResourceBag[];
  moves?: BoardMove[]; 
}

export type ResourceBag = {
  resourceId: ResourceEnum;
  amount: number
}

// evitar rewards que requieren elecciones de usuario por el momento
// la interaccion es mas facil en el momento de pagar el coste (cuando todavia no se ejecuta la move)
export type LocationReward = {
  resources?: ResourceBag[];
  moves?: BoardMove[];
}

export type BoardMove = {
  moveId: string;
  name: string;
  params?: any;
  location?: Location;
}

export type Card = {
  id: string;
  name: string;
  districtIds: string[];

  // card effects must be atomic in case we need rollback
  primaryEffects?: BoardMove;
  secondaryEffects?: BoardMove;
}

// Utils
export type Dictionary<T> = Record<string, T>;