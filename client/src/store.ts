import { create } from "zustand";
import { PlayerState } from "@candyfight/shared/types";
import { getRandomPlayerName } from "@candyfight/shared/services/moves/playerServices";
import { DEFAULT_LOCALE, Locale } from "@candyfight/shared/i18n";
import { ModDefinition, validateModDefinition } from "@candyfight/shared/mods";

export type Screen = "home" | "modLab" | "deckLab";

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

  // Home navigation: home (two windows), the Mod Lab, or the Deck Lab
  screen: Screen;
  setScreen: (screen: Screen) => void;

  // Deep-link into the Deck Lab: when set, DeckLabScreen opens straight into
  // editing this deck set (e.g. the "Edit Deck Set" shortcut from inside the
  // Mod Lab's MAZOS section), then clears itself.
  deckLabTargetId: string | null;
  setDeckLabTargetId: (id: string | null) => void;

  // Where the Deck Set editor's "Volver" should go: null = the Deck Lab's
  // own table (default); otherwise the id of the mod to jump back into
  // (set alongside deckLabTargetId when the trip started from the Mod Lab).
  deckLabReturnModId: string | null;
  setDeckLabReturnModId: (id: string | null) => void;

  // Deep-link into the Mod Lab: when set, ModLabScreen opens straight into
  // editing this mod (mirrors deckLabTargetId), then clears itself.
  modLabTargetId: string | null;
  setModLabTargetId: (id: string | null) => void;

  // Which ModBoardEditor tab to land on when returning via modLabTargetId
  // (e.g. back to MAZOS after editing a deck set) — consumed once on mount.
  modLabReturnView: "board" | "decks" | null;
  setModLabReturnView: (view: "board" | "decks" | null) => void;

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

  deckLabTargetId: null,
  setDeckLabTargetId: (deckLabTargetId) => set({ deckLabTargetId }),

  deckLabReturnModId: null,
  setDeckLabReturnModId: (deckLabReturnModId) => set({ deckLabReturnModId }),

  modLabTargetId: null,
  setModLabTargetId: (modLabTargetId) => set({ modLabTargetId }),

  modLabReturnView: null,
  setModLabReturnView: (modLabReturnView) => set({ modLabReturnView }),

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