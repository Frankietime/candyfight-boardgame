import { create } from "zustand";
import { PlayerState } from "@candyfight/shared/types";
import { getRandomPlayerName } from "@candyfight/shared/services/moves/playerServices";
import { DEFAULT_LOCALE, Locale } from "@candyfight/shared/i18n";
import { ModDefinition, validateModDefinition } from "@candyfight/shared/mods";

export type Screen = "home" | "modLab";

// The loaded cartridge survives a page reload.
const ACTIVE_MOD_STORAGE_KEY = "candyfight.activeMod";

const readStoredActiveMod = (): ModDefinition | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_MOD_STORAGE_KEY);
    if (!raw) return null;
    const result = validateModDefinition(JSON.parse(raw));
    return result.ok ? result.mod : null;
  } catch {
    return null;
  }
};

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

  // Generated display names for bot seats 1..n-1 of the local match
  botNames: string[];
  setBotNames: (names: string[]) => void;

  // Home navigation: home (two windows) or the Mod Lab
  screen: Screen;
  setScreen: (screen: Screen) => void;

  // Loaded cartridge — null means the built-in Base mod
  activeMod: ModDefinition | null;
  setActiveMod: (mod: ModDefinition | null) => void;

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

  botNames: [],
  setBotNames: (botNames) => set({ botNames }),

  screen: "home",
  setScreen: (screen) => set({ screen }),

  activeMod: readStoredActiveMod(),
  setActiveMod: (activeMod) => {
    try {
      if (activeMod) localStorage.setItem(ACTIVE_MOD_STORAGE_KEY, JSON.stringify(activeMod));
      else localStorage.removeItem(ACTIVE_MOD_STORAGE_KEY);
    } catch { /* storage unavailable — cartridge just won't survive reloads */ }
    set({ activeMod });
  },

  locale: DEFAULT_LOCALE,
  setLocale: (locale) => set({ locale }),
}));