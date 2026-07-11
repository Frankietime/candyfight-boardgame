/**
 * Signet card stamping — when a player picks their character, the character's
 * signet ability gets printed onto their Signet card (the effect name the card
 * renderers display), so the card itself says what it does instead of the
 * generic "Signet Trigger".
 */
import { describe, it, expect } from "vitest";
import { Client } from "boardgame.io/client";
import { createTestGame } from "./helpers/createTestGame";
import { CharacterEnum, LocationActionsEnum } from "../enums";
import { characterDefinitions } from "../characters/character-definitions";
import type { Card } from "../types";

const signetEffectName = (cards: Card[]): string | undefined =>
    cards
        .flatMap(c => c.primaryEffects ?? [])
        .find(e => e.actionId === LocationActionsEnum.SIGNET_TRIGGER)?.name;

describe("Signet card shows the owner's character ability", () => {
    it("stamps the ability description onto the signet effect at character selection", () => {
        const client = Client({
            game: { ...createTestGame(), playerView: undefined },
            numPlayers: 2,
            playerID: "0",
        });
        client.start();

        client.updatePlayerID("0");
        client.moves.selectCharacter(CharacterEnum.Kawaiisis);
        client.updatePlayerID("1");
        client.moves.selectCharacter(CharacterEnum.TechBros);

        const { G } = client.getState()!;
        // Hands are dealt from the deck after selection; search the whole collection.
        const collection = (id: string) => [
            ...G.players[id].deck, ...G.players[id].hand, ...G.players[id].discardPile,
        ];

        expect(signetEffectName(collection("0"))).toBe(
            characterDefinitions[CharacterEnum.Kawaiisis].signetAbilityDescription
        );
        expect(signetEffectName(collection("1"))).toBe(
            characterDefinitions[CharacterEnum.TechBros].signetAbilityDescription
        );
    });
});
