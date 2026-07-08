# Candy Fight — Tutorial & Tutor System Spec

> Decisions locked with Franco: **(1) Implemented-only** scope · **(2) Fully scripted
> opponent** · **(3) Plain/functional voice** · **(4) Discrete chapters.**
> Companion doc: [`RULEBOOK.md`](./RULEBOOK.md) is the rules ground truth.

---

## 1. Goals

- Teach the **implemented** ruleset through short, replayable **chapters**.
- Each chapter is a guided script of **steps**: narration → focus signals → an action the
  player performs, or a scripted opponent move shown and confirmed.
- A **signal layer** focuses attention: **glow rings** (reusing the existing selected-card
  / character-info glow language) and **from→to arrows**.
- A single **Advance ("Next")** button drives progression; it is **gated** — disabled until
  the step's interaction requirement is satisfied (so the player actually does the action).

## 2. Architecture

### 2.1 Rule fidelity without fighting boardgame.io

The tutorial does **not** run a networked boardgame.io match (RNG + phase machinery make
deterministic scripting brittle). Instead a **`TutorEngine`** holds a plain `GameState`
(shared type) and mutates it by calling the **real shared services** with a constructed
`MetaGameState` (`{ G, ctx, random: deterministicRandom, events }`). This keeps rule
execution authentic while giving full scripting + determinism control.

Reused real services (no reimplementation of rules):
`placeWorker`, `draw`, `discard`, `trash`, `selectCard`, `resolveCombat`,
`calculateCombatWinner`, `dealHands`, `playersSetup`, `districtsSetup`,
`character executeSignetAbility`.

`deterministicRandom` implements the `random` plugin surface the services use
(`Shuffle`, etc.) as an **identity / seeded** shuffle so deck order and draws are known.

### 2.2 Layers

```
TutorialMode (route/screen)
├─ TutorEngine            // GameState + scripted step runner (no network)
├─ TutorialBoard         // reuses existing presentational components, fed by engine state
│   ├─ GameInfoComponent          (annotated with data-tutor-id)
│   ├─ BoardDistrictsLayer → LocationComponent (annotated)
│   └─ PlayerAreaComponent → CardComponent     (annotated)
├─ TutorOverlay          // absolutely-positioned SVG above the board
│   ├─ GlowRing[]        // border glow around focused anchors
│   └─ Arrow[]           // from→to indicators
├─ OpponentMoveCard      // scripted opponent's played card shown center-screen
└─ TutorDialog           // narration text box + gated Advance button + chapter progress
```

### 2.3 Anchor contract (how signals find their targets)

Presentational components expose stable **`data-tutor-id`** attributes. The overlay locates
them via `document.querySelector('[data-tutor-id="..."]')` and reads `getBoundingClientRect`
each animation frame (handles board scaling). A small `useTutorAnchor(id)` helper sets the
attribute. Stable ids (examples):

| Anchor id | Element |
|-----------|---------|
| `hand-card:{cardId}` | a card in the player's hand |
| `selected-card` | the currently selected card |
| `location:{districtId}:{locationId}` | a board location slot |
| `district:{districtId}` | a district region (presence display) |
| `market:{index}` | a market-row card |
| `worker-pool:{playerId}` | a player's worker count |
| `character-info:{playerId}` | character/signet info panel |
| `resource:{playerId}:{candy\|loot}` | a resource counter |
| `vp:{playerId}` | a player's VP counter |
| `reveal-button` / `pass-button` / `draw-button` | main-phase action buttons |

## 3. Step model (the scripted-scenario format)

```ts
type TutorStep = {
  id: string;
  text: string;                          // plain-language narration
  signals?: TutorSignal[];               // glows + arrows for this step
  interaction?: TutorInteraction;        // what the player must do to unlock Advance
  onEnter?: (engine: TutorEngine) => void;   // e.g. apply a scripted opponent move
  advance?: 'button' | 'auto';           // 'auto' advances when interaction completes
};

type TutorSignal =
  | { kind: 'glow'; anchor: string }
  | { kind: 'arrow'; from: string; to: string; label?: string };

type TutorInteraction =
  | { kind: 'none' }                                   // pure narration; Advance enabled
  | { kind: 'selectCard'; cardId: string }
  | { kind: 'placeWorker'; cardId: string; districtId: string; locationId: string }
  | { kind: 'reveal' }
  | { kind: 'buyCard'; marketIndex: number }
  | { kind: 'confirmOpponent' };                       // view scripted opponent move, click Next

type TutorChapter = {
  id: string;
  title: string;
  summary: string;       // shown in the chapter menu
  initialState: () => GameState;   // deterministic seed for this chapter
  steps: TutorStep[];
};
```

Gating: while a step has an unmet `interaction`, the Advance button is disabled and only the
signalled target(s) are interactive on the board (everything else is click-blocked by the
overlay). When the player performs the required move (validated against the real service
result), the step completes; `auto` steps advance immediately, `button` steps enable Advance.

## 4. Chapters (implemented-only, plain voice)

1. **Goal & The Round** — VP target, the 4-phase loop, what "winning a district" means.
   *(narration + highlight the VP counter and the four districts.)*
2. **Your Hand & Workers** — maintenance dealt you 5 cards and 2 workers. Glow the hand and
   the worker pool.
3. **Place Your First Worker** — interactive: select a single-district card → arrow to its
   matching location → place it. Show cost paid, reward gained, location claimed, **+presence**.
4. **Presence & Districts** — explain presence stacking (claim +1, card effect +1); glow the
   district presence display. Place a second worker to build a lead.
5. **Resources & Deckbuilding** — candy/loot; do a Market buy (trash 2 → buy a card); mention
   Sword Master (extra worker).
6. **Characters & The Signet** — glow character-info; play the Signet card and show the
   character's Signet ability resolve.
7. **Reveal & Turn Order** — reveal to end your round; then the **scripted opponent** takes its
   turns (each played card shown center-screen, advanced with Next).
8. **Combat & Victory** — resolve combat across districts; show who had most presence, award VP;
   restate the path to the VP target.

Each chapter seeds a deterministic `initialState` tailored to its lesson (e.g. Ch.5 seeds a
hand that can afford a market buy; Ch.6 seeds the Signet in hand).

## 5. Signal visuals

- **Glow ring:** reuse the existing card-selected glow / character-info glow tokens
  (SCSS variables) so it reads as the same visual language already in the game.
- **Arrow:** SVG path with an arrowhead marker, animated dash, optional text label at midpoint.
  `from→to` resolved from anchor rects; recomputed each frame for scale/scroll safety.
- The overlay is **pointer-events: none** except for an optional dimming scrim that blocks
  clicks outside the active target.

## 6. Testing (SDD evaluation functions)

- **Engine unit tests (Vitest, shared-style):** each chapter's scripted steps applied in
  order against `TutorEngine` produce the expected `GameState` deltas (presence, resources,
  VP, claimed locations) — i.e. the script is a runnable, asserted scenario.
- **Interaction-gate tests:** an `interaction` only completes when the matching real-service
  move succeeds (e.g. placing the wrong card/location does not advance).
- **Overlay component tests (RTL):** anchors resolve, glow/arrow render for given signals.

## 7. Build order

1. Framework: `TutorEngine` + deterministic random + step types. *(+unit test harness)*
2. Signal layer: `useTutorAnchor`, `TutorOverlay` (glow + arrow), `TutorDialog`.
3. Annotate presentational components with `data-tutor-id`.
4. `TutorialBoard` + `TutorialMode` screen + chapter menu.
5. Author chapters 1→8, each with its asserted scenario test.
6. Entry point from lobby/main menu.
