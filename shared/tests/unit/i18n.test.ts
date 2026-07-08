import { describe, it, expect } from "vitest";
import { translate, DEFAULT_LOCALE, LOCALES } from "../../i18n";

describe("i18n translate", () => {
    it("exposes the supported locales with Spanish as default", () => {
        expect(DEFAULT_LOCALE).toBe("es");
        expect(LOCALES).toEqual(["es", "en"]);
    });

    it("resolves a known nested key in the requested locale", () => {
        // Any real key works; assert it resolves to a non-key string.
        const value = translate("en", "character.chilldudes.name");
        expect(typeof value).toBe("string");
        expect(value).not.toBe("character.chilldudes.name");
    });

    it("returns the raw key when it cannot be resolved in any locale", () => {
        expect(translate("es", "totally.missing.key")).toBe("totally.missing.key");
    });

    it("interpolates {var} placeholders from vars", () => {
        // Use a synthetic missing key so the raw string is the key itself,
        // then confirm interpolation runs over whatever raw text comes back.
        const result = translate("en", "{greeting} world", { greeting: "hello" });
        expect(result).toBe("hello world");
    });

    it("leaves unknown placeholders intact", () => {
        const result = translate("en", "{a}-{b}", { a: "1" });
        expect(result).toBe("1-{b}");
    });

    it("returns the raw string unchanged when no vars are provided", () => {
        expect(translate("en", "{x}")).toBe("{x}");
    });

    it("coerces numeric vars to strings", () => {
        expect(translate("en", "count: {n}", { n: 42 })).toBe("count: 42");
    });
});
