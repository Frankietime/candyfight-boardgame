import { getBaseMod } from "./baseMod";
import { ModCharacter, ModDefinition } from "./types";

/** The mod's character roster, falling back to the base cartridge's 4 when
 *  the mod doesn't define its own (same per-field fallback as resolveDecks). */
export const resolveCharacters = (mod?: ModDefinition): ModCharacter[] =>
    mod?.characters?.length ? mod.characters : getBaseMod().characters!;
