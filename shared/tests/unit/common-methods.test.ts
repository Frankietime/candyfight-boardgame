import { describe, it, expect, vi } from "vitest";
import {
    isNullOrEmpty,
    getEnumStringKeys,
    getEnumNumberKeys,
    log,
} from "../../common-methods";
import { CharacterEnum, PlayerColorsEnum } from "../../enums";

describe("isNullOrEmpty", () => {
    it("treats empty string as empty", () => {
        expect(isNullOrEmpty("")).toBe(true);
    });

    it("treats non-empty string as not empty", () => {
        expect(isNullOrEmpty("x")).toBe(false);
    });

    it("treats null and undefined as empty", () => {
        expect(isNullOrEmpty(null)).toBe(true);
        expect(isNullOrEmpty(undefined)).toBe(true);
    });

    it("treats empty array/object (length 0) as empty", () => {
        expect(isNullOrEmpty([])).toBe(true);
        expect(isNullOrEmpty([1])).toBe(false);
    });

    it("treats objects without length as empty (length undefined → 0 check fails)", () => {
        // {} has no length property → item.length == 0 is false, so not empty
        expect(isNullOrEmpty({})).toBe(false);
        expect(isNullOrEmpty({ a: 1 })).toBe(false);
    });
});

describe("getEnumStringKeys", () => {
    it("returns the string keys of a string enum", () => {
        expect(getEnumStringKeys(CharacterEnum)).toEqual(
            expect.arrayContaining(["ChillDudes", "Kawaiisis", "StreetWizards", "TechBros"])
        );
    });

    it("filters out numeric keys of a numeric enum", () => {
        // PlayerColorsEnum is numeric → reverse-mapped numeric keys are excluded
        const keys = getEnumStringKeys(PlayerColorsEnum);
        expect(keys).toEqual(expect.arrayContaining(["red", "green", "violet", "yellow"]));
        expect(keys.some(k => !isNaN(parseInt(k)))).toBe(false);
    });
});

describe("getEnumNumberKeys", () => {
    it("returns numeric reverse-map keys parsed as numbers", () => {
        const keys = getEnumNumberKeys(PlayerColorsEnum);
        expect(keys).toEqual(expect.arrayContaining([0, 1, 2, 3]));
    });
});

describe("log", () => {
    it("logs a plain message", () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {});
        log("hello");
        expect(spy).toHaveBeenCalledWith("    -> hello");
        spy.mockRestore();
    });

    it("logs a phase message with phase decoration", () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {});
        log("MAIN", true);
        expect(spy).toHaveBeenCalledWith("**  MAIN PHASE  **");
        spy.mockRestore();
    });

    it("logs a separator when no text is given", () => {
        const spy = vi.spyOn(console, "log").mockImplementation(() => {});
        log();
        expect(spy).toHaveBeenCalledWith("");
        log(undefined, true);
        expect(spy).toHaveBeenCalledWith("----");
        spy.mockRestore();
    });
});
