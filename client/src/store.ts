import { create } from "zustand";
import { ComponentType } from "react";
import { PlayerState } from "@candyfight/shared/types";
import { getRandomPlayerName } from "@candyfight/shared/services/moves/playerServices";

/**
 * boardgame.io Client component type.
 * Result of calling Client({ game, board, multiplayer }).
 */
type GameClientComponent = ComponentType<{
  matchID?: string;
  playerID?: string;
  credentials?: string;
}>;

/**
 * boardgame.io SocketIO transport factory.
 * Result of calling SocketIO({ server }).
 * Using `any` for compatibility with boardgame.io internal types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SocketIOTransportFactory = (transportOpts: any) => any;

type AppState = {
  // Player state
  playerState: PlayerState;
  setPlayerState: (p: PlayerState) => void;

  // boardgame.io client component instance
  client: GameClientComponent | null;
  setClient: (client: GameClientComponent | null) => void;

  // boardgame.io transport factory
  server: SocketIOTransportFactory | null;
  setServer: (server: SocketIOTransportFactory | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Player state
  playerState: { name: getRandomPlayerName() } as PlayerState,
  setPlayerState: (p) => set({ playerState: p }),

  // Client instances - null until initialized
  client: null,
  setClient: (client) => set({ client }),

  server: null,
  setServer: (server) => set({ server }),
}));