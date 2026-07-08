import { describe, it, expect } from "vitest";
import { characterDefinitions } from "../../../characters/character-definitions";
// Ensure the DRAW/ADD_PRESENCE actions the signet abilities call are registered.
import "../../../actions/core-actions";
import { CharacterEnum, DistrictIconsEnum, ResourceEnum } from "../../../enums";
import { makeCard, makeDistrict, makeGameState, makeLocation, makeMetaState, makePlayer } from "../factories";

describe("characterDefinitions metadata", () => {
    it("defines all four characters keyed by their enum value", () => {
        for (const id of Object.values(CharacterEnum)) {
            const def = characterDefinitions[id];
            expect(def.id).toBe(id);
            expect(def.name).toBeTruthy();
            expect(def.description).toBeTruthy();
            expect(def.signetAbilityDescription).toBeTruthy();
            expect(typeof def.executeSignetAbility).toBe("function");
        }
    });
});

describe("signet abilities", () => {
    it("Chill Dudes: +1 loot and draw 1", () => {
        const player = makePlayer({ [ResourceEnum.Loot]: 0, deck: [makeCard()], hand: [] });
        characterDefinitions[CharacterEnum.ChillDudes].executeSignetAbility(makeMetaState(), player);
        expect(player[ResourceEnum.Loot]).toBe(1);
        expect(player.hand).toHaveLength(1);
    });

    it("Tech Bros: +1 candy and draw 2", () => {
        const player = makePlayer({ [ResourceEnum.Candy]: 0, deck: [makeCard(), makeCard()], hand: [] });
        characterDefinitions[CharacterEnum.TechBros].executeSignetAbility(makeMetaState(), player);
        expect(player[ResourceEnum.Candy]).toBe(1);
        expect(player.hand).toHaveLength(2);
    });

    it("Street Wizards: +3 loot", () => {
        const player = makePlayer({ [ResourceEnum.Loot]: 0 });
        characterDefinitions[CharacterEnum.StreetWizards].executeSignetAbility(makeMetaState(), player);
        expect(player[ResourceEnum.Loot]).toBe(3);
    });

    it("Kawaiisis: +2 candy and +1 presence in the current district", () => {
        const district = makeDistrict({ id: DistrictIconsEnum.D3, presence: {} });
        const state = makeMetaState({ G: makeGameState({ districts: [district] }) });
        const player = makePlayer({ id: "0", [ResourceEnum.Candy]: 0 });
        characterDefinitions[CharacterEnum.Kawaiisis].executeSignetAbility(state, player, {
            location: makeLocation({ districtId: DistrictIconsEnum.D3 }),
        });
        expect(player[ResourceEnum.Candy]).toBe(2);
        expect(state.G.districts[0].presence["0"]).toEqual({ playerID: "0", amount: 1 });
    });
});
