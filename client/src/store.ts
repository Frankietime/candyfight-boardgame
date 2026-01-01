import { create } from "zustand";
import { PlayerState } from "@candyfight/shared/types";
import { LobbyAPI } from "boardgame.io";
import { getRandomPlayerName } from "@candyfight/shared/services/moves/playerServices";

type AppState = {
  playerState: PlayerState;
  setPlayerState: (p: PlayerState) => void;

  matchData: any;
  setMatchData: (m: any) => void;

  client: any;
  setClient: (client: any) => void;

  server: any;
  setServer: (client: any) => void;
}

export const useAppStore = create<AppState>((set) => ({
  playerState: { name: getRandomPlayerName()} as PlayerState,
  setPlayerState: (p) => set({ playerState: p }),
  
  matchData: {} as LobbyAPI.Match,
  setMatchData: (m) => set({ matchData: m }),

  client: {},
  setClient: (client: any) => set({ client }),

  server: {},
  setServer: (server: any) => set({ server })
}));