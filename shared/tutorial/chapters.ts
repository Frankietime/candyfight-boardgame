/**
 * The Candy Fight tutorial — 3 discrete, implemented-only chapters (plain voice).
 *
 * Board indices used below (see getInitialDistrictsState):
 *   0 Conurbaplex · 1 Ecoplex · 2 Streets · 3 AGI Control Zone
 *   Streets:      0 Easy Job (no cost, +1 loot) · 1 Bargain · 2 Restricted · 3 High Council
 *   Conurbaplex:  0 Restricted · 1 Market (trash 2 → buy) · 2 High Council · 3 Time for Candy
 *   Ecoplex:      0 Market (trash 2 → buy) · 1 Momentum · 2 Restricted · 3 High Council
 *   AGI:          0 High Council · 1 Time is Gold (loot 2 → draw 2) · 2 Sword Master (candy 4 → +worker) · 3 Restricted
 *
 * Locations are varied across chapters. Game terms stay in English (see messages.ts).
 * All player-facing strings are i18n KEYS resolved by the client via `useT`.
 */
import { CharacterEnum, DistrictIconsEnum as D } from "../enums";
import { createParams } from "../actions/action-params";
import { buildTutorState } from "./tutorEngine";
import { anchors, TutorChapter } from "./types";
import { districtCard, dualCard, fillerCard, signetCard } from "./cards";

const HUMAN = "0";
const RIVAL = "1";

// Board coordinates referenced by the chapters.
const STREETS = 2;
const EASY_JOB = 0;
const ECOPLEX = 1;
const ECO_MARKET = 0;
const AGI = 3;
const AGI_HIGH_COUNCIL = 0;
const TIME_IS_GOLD = 1;
const SWORD_MASTER = 2;

// ── Chapter 1 — The Basics (goal · districts · cost+reward · first worker) ──────
const chapterBasics: TutorChapter = {
    id: "basics",
    title: "tutorial.basics.title",
    summary: "tutorial.basics.summary",
    initialState: () =>
        buildTutorState({
            players: [
                {
                    id: HUMAN,
                    hand: [
                        districtCard(D.D4, "b-d4"),
                        districtCard(D.D1, "b-d1"),
                        districtCard(D.D2, "b-d2"),
                        districtCard(D.D3, "b-d3"),
                        signetCard("b-signet"),
                    ],
                    deck: [fillerCard(D.D2, "b-k1"), fillerCard(D.D2, "b-k2"), fillerCard(D.D2, "b-k3")],
                },
                { id: RIVAL },
            ],
        }),
    steps: [
        {
            id: "objective",
            text: "tutorial.basics.objective",
        },
        {
            id: "vpCounter",
            text: "tutorial.basics.vpCounter",
            signals: [
                { kind: "glow", anchor: anchors.vp(HUMAN) },
                { kind: "arrow", to: anchors.vp(HUMAN) },
            ],
        },
        {
            id: "districtsLoop",
            text: "tutorial.basics.districtsLoop",
            signals: [
                { kind: "glow", anchor: anchors.district(D.D1) },
                { kind: "glow", anchor: anchors.district(D.D2) },
                { kind: "glow", anchor: anchors.district(D.D3) },
                { kind: "glow", anchor: anchors.district(D.D4) },
            ],
        },
        {
            id: "phases",
            text: "tutorial.basics.phases",
            signals: [
                { kind: "glow", anchor: anchors.district(D.D1) },
                { kind: "glow", anchor: anchors.district(D.D2) },
                { kind: "glow", anchor: anchors.district(D.D3) },
                { kind: "glow", anchor: anchors.district(D.D4) },
            ],
        },
        {
            id: "hand",
            text: "tutorial.basics.hand",
            signals: [
                { kind: "glow", anchor: anchors.handCard("b-d4") },
                { kind: "glow", anchor: anchors.district(D.D4) },
                { kind: "arrow", from: anchors.handCard("b-d4"), to: anchors.district(D.D4) },
            ],
        },
        {
            id: "workers",
            text: "tutorial.basics.workers",
            signals: [{ kind: "glow", anchor: anchors.workerPool(HUMAN) }],
        },
        {
            // Explain the cost and reward BEFORE asking for the play.
            id: "costReward",
            text: "tutorial.basics.costReward",
            signals: [
                { kind: "glow", anchor: anchors.location(AGI, TIME_IS_GOLD) },
                { kind: "glow", anchor: anchors.resource(HUMAN, "loot") },
            ],
        },
        {
            id: "select",
            text: "tutorial.basics.select",
            signals: [{ kind: "glow", anchor: anchors.handCard("b-d4") }],
            interaction: { kind: "selectCard", cardId: "b-d4" },
            gateHint: "gate.card",
        },
        {
            id: "place",
            text: "tutorial.basics.place",
            signals: [
                { kind: "glow", anchor: anchors.location(AGI, TIME_IS_GOLD) },
                { kind: "arrow", from: anchors.handCard("b-d4"), to: anchors.location(AGI, TIME_IS_GOLD), label: "tutorial.label.place" },
            ],
            interaction: { kind: "placeWorker", cardId: "b-d4", districtIndex: AGI, locationIndex: TIME_IS_GOLD },
            gateHint: "gate.location",
        },
        {
            id: "result",
            text: "tutorial.basics.result",
            signals: [{ kind: "glow", anchor: anchors.district(D.D4) }],
        },
    ],
};

// ── Chapter 2 — Presence, Deckbuilding & Sword Master ──────────────────────────
const chapterBuild: TutorChapter = {
    id: "build",
    title: "tutorial.build.title",
    summary: "tutorial.build.summary",
    initialState: () =>
        buildTutorState({
            players: [
                {
                    id: HUMAN,
                    candy: 5,
                    loot: 3,
                    characterId: CharacterEnum.TechBros,
                    maxNumberOfWorkers: 3,
                    // Fillers sit right after the market card so the scripted trash picks them.
                    hand: [
                        districtCard(D.D3, "v-d3"),       // → Easy Job (presence)
                        dualCard(D.D2, D.D3, "v-mkt"),    // → Ecoplex Market
                        fillerCard(D.D1, "v-f1"),         // trash fodder
                        fillerCard(D.D1, "v-f2"),         // trash fodder
                        districtCard(D.D4, "v-sword"),    // → Sword Master
                    ],
                    deck: [fillerCard(D.D1, "v-k1"), fillerCard(D.D1, "v-k2"), fillerCard(D.D1, "v-k3")],
                },
                {
                    id: RIVAL,
                    loot: 2,
                    maxNumberOfWorkers: 1,
                    hand: [districtCard(D.D4, "v-r1")],
                    deck: [fillerCard(D.D1, "v-rk1"), fillerCard(D.D1, "v-rk2")],
                },
            ],
            cardMarket: [dualCard(D.D1, D.D3, "v-buy"), dualCard(D.D2, D.D4, "v-buy2")],
        }),
    steps: [
        {
            id: "presence",
            text: "tutorial.build.presence",
            signals: [{ kind: "glow", anchor: anchors.district(D.D3) }],
        },
        {
            id: "select",
            text: "tutorial.build.select",
            signals: [{ kind: "glow", anchor: anchors.handCard("v-d3") }],
            interaction: { kind: "selectCard", cardId: "v-d3" },
            gateHint: "gate.card",
        },
        {
            id: "place",
            text: "tutorial.build.place",
            signals: [
                { kind: "glow", anchor: anchors.location(STREETS, EASY_JOB) },
                { kind: "arrow", from: anchors.handCard("v-d3"), to: anchors.location(STREETS, EASY_JOB), label: "tutorial.label.place" },
            ],
            interaction: { kind: "placeWorker", cardId: "v-d3", districtIndex: STREETS, locationIndex: EASY_JOB },
            gateHint: "gate.location",
        },
        {
            id: "count",
            text: "tutorial.build.count",
            signals: [{ kind: "glow", anchor: anchors.district(D.D3) }],
        },
        {
            id: "resources",
            text: "tutorial.build.resources",
            signals: [
                { kind: "glow", anchor: anchors.resource(HUMAN, "candy") },
                { kind: "glow", anchor: anchors.resource(HUMAN, "loot") },
                { kind: "arrow", to: anchors.resource(HUMAN, "candy") },
                { kind: "arrow", to: anchors.resource(HUMAN, "loot") },
            ],
        },
        {
            // Introduce the Card Market mechanic before using one.
            id: "marketIntro",
            text: "tutorial.build.marketIntro",
            signals: [{ kind: "glow", anchor: anchors.location(ECOPLEX, ECO_MARKET) }],
        },
        {
            // Explain the market's cost (trash 2) and reward (a card) before the play.
            id: "selectMarket",
            text: "tutorial.build.selectMarket",
            signals: [{ kind: "glow", anchor: anchors.handCard("v-mkt") }],
            interaction: { kind: "selectCard", cardId: "v-mkt" },
            gateHint: "gate.card",
        },
        {
            id: "buy",
            text: "tutorial.build.buy",
            modalText: { trash: "tutorial.build.buyTrash", buy: "tutorial.build.buyPick" },
            signals: [
                { kind: "glow", anchor: anchors.location(ECOPLEX, ECO_MARKET) },
                { kind: "arrow", from: anchors.handCard("v-mkt"), to: anchors.location(ECOPLEX, ECO_MARKET), label: "tutorial.label.buy" },
            ],
            interaction: { kind: "buyCard", cardId: "v-mkt", districtIndex: ECOPLEX, locationIndex: ECO_MARKET, marketIndex: 0, trashCardIds: ["v-f1", "v-f2"] },
            gateHint: "gate.market",
        },
        {
            id: "discardHover",
            text: "tutorial.build.discardHover",
            signals: [
                { kind: "glow", anchor: anchors.pile(HUMAN, "discard") },
                { kind: "glow", anchor: anchors.pileCard("v-buy") },
                // The bought card travelled from the Market to your Discard pile.
                { kind: "arrow", from: anchors.location(ECOPLEX, ECO_MARKET), to: anchors.pile(HUMAN, "discard"), label: "tutorial.label.toDiscard" },
            ],
        },
        {
            id: "counters",
            text: "tutorial.build.counters",
            signals: [
                { kind: "glow", anchor: anchors.pile(HUMAN, "deck") },
                { kind: "glow", anchor: anchors.pile(HUMAN, "trash") },
            ],
        },
        {
            // Open the player's info panel and focus the Signet-ability block inside it.
            id: "character",
            text: "tutorial.build.character",
            openPlayerModal: HUMAN,
            signals: [{ kind: "glow", anchor: anchors.signetInfo(HUMAN) }],
        },
        {
            id: "swordmaster",
            text: "tutorial.build.swordmaster",
            signals: [
                { kind: "glow", anchor: anchors.handCard("v-sword") },
                { kind: "glow", anchor: anchors.location(AGI, SWORD_MASTER) },
                { kind: "arrow", from: anchors.handCard("v-sword"), to: anchors.location(AGI, SWORD_MASTER), label: "tutorial.label.place" },
            ],
            interaction: { kind: "placeWorker", cardId: "v-sword", districtIndex: AGI, locationIndex: SWORD_MASTER },
            gateHint: "gate.location",
        },
        {
            id: "opponent",
            text: "tutorial.build.opponent",
            opponent: { card: districtCard(D.D4, "v-r1"), caption: "tutorial.build.opponentCaption" },
            onEnter: engine => {
                engine.selectCard(RIVAL, "v-r1");
                engine.placeWorker(RIVAL, AGI, TIME_IS_GOLD, "v-r1");
            },
            interaction: { kind: "confirmOpponent" },
            signals: [{ kind: "glow", anchor: anchors.location(AGI, TIME_IS_GOLD) }],
        },
        {
            id: "result",
            text: "tutorial.build.result",
            signals: [{ kind: "glow", anchor: anchors.workerPool(HUMAN) }],
        },
    ],
};

// ── Chapter 3 — Characters & the Signet (signet only) ───────────────────────────
const chapterSignet: TutorChapter = {
    id: "signet",
    title: "tutorial.signet.title",
    summary: "tutorial.signet.summary",
    initialState: () =>
        buildTutorState({
            players: [
                { id: HUMAN, loot: 0, characterId: CharacterEnum.StreetWizards, hand: [signetCard("s-signet")] },
                { id: RIVAL },
            ],
        }),
    steps: [
        {
            id: "charIntro",
            text: "tutorial.signet.charIntro",
            signals: [{ kind: "glow", anchor: anchors.characterInfo(HUMAN) }],
        },
        {
            // Open the player's info modal and focus the Signet-ability block inside it.
            id: "abilities",
            text: "tutorial.signet.abilities",
            openPlayerModal: HUMAN,
            signals: [{ kind: "glow", anchor: anchors.signetInfo(HUMAN) }],
        },
        {
            id: "selectSignet",
            text: "tutorial.signet.selectSignet",
            signals: [{ kind: "glow", anchor: anchors.handCard("s-signet") }],
            interaction: { kind: "selectCard", cardId: "s-signet" },
            gateHint: "gate.signet",
        },
        {
            id: "playSignet",
            text: "tutorial.signet.playSignet",
            signals: [
                { kind: "glow", anchor: anchors.location(STREETS, EASY_JOB) },
                { kind: "arrow", from: anchors.handCard("s-signet"), to: anchors.location(STREETS, EASY_JOB) },
            ],
            interaction: { kind: "placeWorker", cardId: "s-signet", districtIndex: STREETS, locationIndex: EASY_JOB },
            gateHint: "gate.location",
        },
        {
            id: "signetResult",
            text: "tutorial.signet.signetResult",
            signals: [{ kind: "glow", anchor: anchors.resource(HUMAN, "loot") }],
        },
    ],
};

// ── Chapter 4 — A full round: play, rival plays, reveal, Combat ──────────────────
const chapterCombat: TutorChapter = {
    id: "combat",
    title: "tutorial.combat.title",
    summary: "tutorial.combat.summary",
    initialState: () =>
        buildTutorState({
            // A fresh round from zero — no preset presence. You play, the rival plays,
            // presence climbs, then Combat scores the districts.
            players: [
                // Two plays: Streets (yours to win) then contest AGI at Time is Gold.
                {
                    id: HUMAN,
                    loot: 3,
                    characterId: CharacterEnum.StreetWizards,
                    hand: [districtCard(D.D3, "c-h1"), districtCard(D.D4, "c-h2")],
                    deck: [fillerCard(D.D3, "c-hk1"), fillerCard(D.D3, "c-hk2")],
                },
                {
                    // The rival is Tech Bros — a different Signet ability, to show asymmetry.
                    // The extra hand filler stays after paying High Council's discard(2),
                    // keeping the signet's card draw visible at the end of the chapter.
                    id: RIVAL,
                    candy: 4,
                    characterId: CharacterEnum.TechBros,
                    hand: [signetCard("c-rsignet"), districtCard(D.D4, "c-r2"), fillerCard(D.D1, "c-rh1")],
                    deck: [fillerCard(D.D1, "c-rk1"), fillerCard(D.D1, "c-rk2")],
                },
            ],
        }),
    steps: [
        {
            id: "roundIntro",
            text: "tutorial.combat.roundIntro",
            signals: [
                { kind: "glow", anchor: anchors.district(D.D3) },
                { kind: "glow", anchor: anchors.district(D.D4) },
            ],
        },
        {
            // You play first.
            id: "playStreets",
            text: "tutorial.combat.playStreets",
            signals: [
                { kind: "glow", anchor: anchors.handCard("c-h1") },
                { kind: "glow", anchor: anchors.location(STREETS, EASY_JOB) },
                { kind: "arrow", from: anchors.handCard("c-h1"), to: anchors.location(STREETS, EASY_JOB), label: "tutorial.label.place" },
            ],
            interaction: { kind: "placeWorker", cardId: "c-h1", districtIndex: STREETS, locationIndex: EASY_JOB },
            gateHint: "gate.location",
        },
        {
            id: "presenceUp",
            text: "tutorial.combat.presenceUp",
            signals: [{ kind: "glow", anchor: anchors.district(D.D3) }],
        },
        {
            // Rival's 1st play — asymmetry: Tech Bros signet (draw 2 + candy) at Sword Master.
            id: "rivalSignet",
            text: "tutorial.combat.rivalSignet",
            opponent: { card: signetCard("c-rsignet"), caption: "tutorial.combat.opponentSignetCaption" },
            onEnter: engine => {
                engine.selectCard(RIVAL, "c-rsignet");
                engine.placeWorker(RIVAL, AGI, SWORD_MASTER, "c-rsignet");
            },
            interaction: { kind: "confirmOpponent" },
            signals: [{ kind: "glow", anchor: anchors.location(AGI, SWORD_MASTER) }],
        },
        {
            // Your 2nd play — you take a turn before the rival plays again (interleaved).
            id: "playAgi",
            text: "tutorial.combat.playAgi",
            signals: [
                { kind: "glow", anchor: anchors.handCard("c-h2") },
                { kind: "glow", anchor: anchors.location(AGI, TIME_IS_GOLD) },
                { kind: "arrow", from: anchors.handCard("c-h2"), to: anchors.location(AGI, TIME_IS_GOLD), label: "tutorial.label.place" },
            ],
            interaction: { kind: "placeWorker", cardId: "c-h2", districtIndex: AGI, locationIndex: TIME_IS_GOLD },
            gateHint: "gate.location",
        },
        {
            // Rival's 2nd play — reinforces AGI via the High Council (restricted
            // areas are not placeable), discarding the two cards its signet just
            // drew to pay the cost, then reveals.
            id: "rivalPush",
            text: "tutorial.combat.rivalPush",
            opponent: { card: districtCard(D.D4, "c-r2"), caption: "tutorial.combat.opponentCaption" },
            onEnter: engine => {
                engine.selectCard(RIVAL, "c-r2");
                engine.placeWorker(RIVAL, AGI, AGI_HIGH_COUNCIL, "c-r2", {
                    costParams: createParams.discard(["c-rk1", "c-rk2"]),
                });
                engine.reveal(RIVAL);
            },
            interaction: { kind: "confirmOpponent" },
            signals: [{ kind: "glow", anchor: anchors.location(AGI, AGI_HIGH_COUNCIL) }],
        },
        {
            // You close your round.
            id: "reveal",
            text: "tutorial.combat.reveal",
            signals: [{ kind: "glow", anchor: anchors.revealButton() }],
            interaction: { kind: "reveal" },
            gateHint: "gate.reveal",
        },
        {
            // One combatPhase step: shows the results table AND owns the working End Round
            // button (a single scripted player — no enemy approval is modeled here).
            id: "combatResolve",
            text: "tutorial.combat.combatResolve",
            phase: "combatPhase",
            onEnter: engine => engine.runCombat(),
            interaction: { kind: "endRound" },
            gateHint: "gate.endRound",
            advance: "auto",
        },
        {
            id: "victory",
            text: "tutorial.combat.victory",
            signals: [
                { kind: "glow", anchor: anchors.vp(HUMAN) },
                { kind: "arrow", to: anchors.vp(HUMAN) },
            ],
        },
    ],
};

export const tutorialChapters: TutorChapter[] = [chapterBasics, chapterBuild, chapterSignet, chapterCombat];
