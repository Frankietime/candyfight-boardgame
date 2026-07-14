import { create } from "zustand";
import { PlayerState } from "@candyfight/shared/types";
import { getRandomPlayerName } from "@candyfight/shared/services/moves/playerServices";
import { DEFAULT_LOCALE, Locale } from "@candyfight/shared/i18n";

type AppState = {
  // Player state
  playerState: PlayerState;
  setPlayerState: (p: PlayerState) => void;

  // Tutorial mode
  tutorialOpen: boolean;
  setTutorialOpen: (open: boolean) => void;

  // vs-Bots mode: total seats of the local bot match (human + bots), null when off
  botSeats: number | null;
  setBotSeats: (seats: number | null) => void;

  // i18n — Spanish by default
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Player state
  playerState: { name: getRandomPlayerName() } as PlayerState,
  setPlayerState: (p) => set({ playerState: p }),

  tutorialOpen: false,
  setTutorialOpen: (tutorialOpen) => set({ tutorialOpen }),

  botSeats: null,
  setBotSeats: (botSeats) => set({ botSeats }),

  locale: DEFAULT_LOCALE,
  setLocale: (locale) => set({ locale }),
}));