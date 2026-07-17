import { describe, it, expect } from "vitest";
import { getBaseMod } from "../../../mods/baseMod";
// Ensure the DRAW/ADD_PRESENCE actions the signet abilities call are registered.
import "../../../actions/core-actions";
import { CharacterEnum, DistrictIconsEnum, ResourceEnum } from "../../../enums";
import { executeCharacterSignet, stampSignetAbility } from "../../../services/signetService";
import { LocationActionsEnum } from "../../../enums";
import {
    makeCard,
    makeDistrict,
    makeGameState,
    makeLocation,
    makeMetaState,
    makePlayer,
} from "../factories";

const baseCharacters = () => getBaseMod().characters!;

describe("base character roster metadata", () => {
    it("defines all four characters keyed by their enum value", () => {
        for (const id of Object.values(CharacterEnum)) {
            const character = baseCharacters().find(c => c.id === id);
            expect(character?.name).toBeTruthy();
            expect(character?.description).toBeTruthy();
            expect(character?.emoji).toBeTruthy();
            expect(character?.color).toBeTruthy();
            expect(character?.signet).toBeTruthy();
        }
    });
});

describe("executeCharacterSignet (data-driven)", () => {
    it("Chill Dudes: +1 loot and draw 1", () => {
        const player = makePlayer({
            characterId: CharacterEnum.ChillDudes,
            [ResourceEnum.Loot]: 0,
            deck: [makeCard()],
            hand: [],
        });
        executeCharacterSignet(makeMetaState({ G: makeGameState() }), player);
        expect(player[ResourceEnum.Loot]).toBe(1);
        expect(player.hand).toHaveLength(1);
    });

    it("Tech Bros: +1 candy and draw 2", () => {
        const player = makePlayer({
            characterId: CharacterEnum.TechBros,
            [ResourceEnum.Candy]: 0,
            deck: [makeCard(), makeCard()],
            hand: [],
        });
        executeCharacterSignet(makeMetaState({ G: makeGameState() }), player);
        expect(player[ResourceEnum.Candy]).toBe(1);
        expect(player.hand).toHaveLength(2);
    });

    it("Street Wizards: +3 loot", () => {
        const player = makePlayer({ characterId: CharacterEnum.StreetWizards, [ResourceEnum.Loot]: 0 });
        executeCharacterSignet(makeMetaState({ G: makeGameState() }), player);
        expect(player[ResourceEnum.Loot]).toBe(3);
    });

    it("Kawaiisis: +2 candy and +1 presence in the current district", () => {
        const district = makeDistrict({ id: DistrictIconsEnum.D3, presence: {} });
        const state = makeMetaState({ G: makeGameState({ districts: [district] }) });
        const player = makePlayer({ id: "0", characterId: CharacterEnum.Kawaiisis, [ResourceEnum.Candy]: 0 });
        executeCharacterSignet(state, player, { location: makeLocation({ districtId: DistrictIconsEnum.D3 }) });
        expect(player[ResourceEnum.Candy]).toBe(2);
        expect(state.G.districts[0].presence["0"]).toEqual({ playerID: "0", amount: 1 });
    });

    it("no-ops when the player has no character or the roster has no match", () => {
        const player = makePlayer({ characterId: undefined });
        expect(() => executeCharacterSignet(makeMetaState({ G: makeGameState() }), player)).not.toThrow();
    });
});

describe("stampSignetAbility", () => {
    it("prints the signet's resources + action names onto the SIGNET_TRIGGER card", () => {
        const signetCard = makeCard({
            primaryEffects: [{ actionId: LocationActionsEnum.SIGNET_TRIGGER, name: "Signet Trigger" }],
        });
        const player = makePlayer({ characterId: CharacterEnum.Kawaiisis, hand: [signetCard], deck: [], discardPile: [] });
        stampSignetAbility(baseCharacters(), player);
        expect(signetCard.primaryEffects![0].name).toBe("+2 candy, Fight!");
    });
});
