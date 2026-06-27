# Implementation Spec - Candy Fight AI Player (Bot)

Status: DRAFT for human review
Author: planner subagent
Date: 2026-06-20
Updated: 2026-06-20 - human decisions applied (see 'Resolved decisions')
Inputs reconciled:
- `backlog/ai-bot-plan.md` (original feature plan)
- `software-factory/_bmad-output/planning-artifacts/research/technical-candyfight-ai-bot-validation-research-2026-06-20.md` (independent validation, verdict: SOUND-WITH-CHANGES)

Verified library facts (installed `boardgame.io@0.50.2`):
- `boardgame.io/ai` exports `Bot`, `MCTSBot`, `RandomBot`, `Simulate`, `Step`.
- `Bot` ctor: `{ enumerate, seed }`; `enumerate(G, ctx, playerID)` returns candidate moves.
- `MCTSBot` ctor: `{ enumerate, seed, objectives, game, iterations, playoutDepth, iterationCallback }`; defaults `iterations=1000`, `playoutDepth=50`; `iterations`/`playoutDepth` may be functions of `(G, ctx)`.

---

## Goal
Ship a playable, server-recorded AI opponent for Candy Fight whose first real deliverable is a tuned `MCTSBot` + `objectives` heuristic wired through a correct multi-phase `enumerate`, with behavioral-cloning/ONNX explicitly deferred.

---

## Resolved decisions (human)
- **Hidden information: full-state PvE for v1 (CONFIRMED).** The v1 MCTS searches the real `G`, including opponents' hands. Accepted tradeoff: the bot is stronger-than-fair and does not model uncertainty. Fair-play (determinization) is the planned Stage 2 upgrade (see Deferred scope), not a rewrite - it swaps only the state the search reads.
- **Input-requiring locations (DISCARD/TRASH/BUY_CARD): option (b) param synthesis, IN SCOPE (CONFIRMED essential).** Card-buying/discard/trash is an essential part of the game, so the bot must eventually use these locations. Delivered in two stages so the first iteration stays small:
  - **Stage A** (subtask 2): `enumerate` temporarily EXCLUDES input-requiring locations so the first bot is correct and ships. This is a known capability gap, not the end state.
  - **Stage B** (subtask 12): `enumerate` synthesizes `moveParams.cardIds` (cost/reward card choices) so those locations become legal, complete bot moves. Required to consider the bot feature-complete.
- **Reducer bug (separate follow-up):** `placeWorker` ignores failed `actionRegistry.execute`, allowing an illegal free claim when `cardIds` are missing. This is a real game-rules bug exploitable by any client, tracked independently of the bot work (see subtask 13).

---

## Scope

### In scope (first increment = the only committed milestone)
1. `enumerate(G, ctx, playerID)` covering all five phases.
2. `RandomBot` smoke harness (free, validates `enumerate`).
3. Tuned `MCTSBot` + `objectives(G, ctx, playerID)` as the PRIMARY bot.
4. Client "vs Bot" mode wiring.
5. Server-side training-data export endpoint (initial state + move log, deterministic replay) - low cost, no model dependency.
6. Stage B - `moveParams.cardIds` synthesis so input-requiring locations (card-buying/discard/trash) become usable bot moves (subtask 12). Essential; may land in a second iteration after Stage A ships.

### Deferred / future scope (documented, NOT built now)
- Phase 3-5 of the backlog: `featureExtractor.ts`, Python pipeline (`ai-training/`), ONNX `botModel.ts`/`LearningBot.ts`.
- If a learned net is later pursued, target AlphaZero-lite self-play (reuses `enumerate` + a value net) rather than behavioral cloning. Behavioral cloning is at most an optional warm-start.
- **Stage 2 - Determinization (fair, non-cheating MCTS).** Upgrade path off full-state PvE; see dedicated subsection below.

#### Stage 2 - Determinization upgrade path (de-cheating MCTS)
Goal: make the bot decide using only legally-visible information instead of reading opponents' real hands. This is a contained addition - `enumerate`, `objectives`, the reducer step, the bot wiring and the lobby are all UNCHANGED; only the state fed into the search changes.
Per bot move:
1. **Hide** the unseen state (opponents' hands, deck order).
2. **Sample** a plausible world: deal the hidden cards randomly from the set consistent with public info (cards already played/visible, deck composition, counts) - a single "determinization".
3. Run MCTS on that sampled `G`.
4. Repeat over N samples and **average** the per-move statistics.
5. Pick the move that is best on average across the imagined worlds (naturally hedges against not knowing).
New component required: a **hand/deck sampler** that reconstructs possible hidden states from public info - the only genuinely new code. Cost: ~N x MCTS compute per move (tune N vs think-time). Known limitation: plain determinization cannot strategically gather info or bluff perfectly; Information-Set MCTS (ISMCTS) addresses that and is a further, rarely-needed step. Determinization and a future self-play value net are orthogonal levers and can combine.
Trigger to build: only if PvE playtesting shows the full-state bot feels unfair ("reads minds") or plays too clinically.

### Out of scope (this increment)
- Stage 2 determinization / ISMCTS (planned, deferred per above).
- Retraining flywheel, model versioning, GPU.

---

## Ground-truth codebase facts (correct these vs the backlog)

The backlog's phase list and several identifiers are wrong. Authoritative facts from the repo:

- Phases (in `shared/Game.ts`), in order: `characterSelectionPhase` -> `maintenancePhase` -> `mainPhase` -> `combatPhase` -> `endGamePhase`. The backlog OMITS `maintenancePhase` and mislabels the phase set as 4. `maintenancePhase` has NO player moves (auto via `onBegin`/`endIf`), so `enumerate` returns `[]` there.
- Moves per phase (exact names):
  - `characterSelectionPhase`: `selectCharacter(characterId: CharacterEnum)`. `turn.activePlayers = { all: Stage.NULL }`; acting player is `mgState.playerID`, NOT `ctx.currentPlayer`.
  - `mainPhase`: `draw()`, `selectCard(card)`, `placeWorker(districtIdx, locationIdx, card, moveParams?)`, `reveal()`, `pass()`.
  - `combatPhase`: `endRound()` (backlog matches). `turn.activePlayers = { all: Stage.NULL }`.
  - `endGamePhase`: `goToLobby()` (backlog matches). `turn.activePlayers = { all: Stage.NULL }`.
- `placeWorker` args are NUMERIC ARRAY INDICES, not string IDs: `getCurrentLocation` does `G.districts[districtID].locations[locationID]` (`shared/services/moves/helper.ts`). The backlog's `placeWorker(dId, lId, card)` "districtID/locationID" must be 0-based indices.
- Board shape: 4 districts (`getInitialDistrictsState`, `shared/services/locationServices.ts`), each with 4 locations => max 16 location cells. `DistrictIconsEnum` = `D1..D4` ("LOC1".."LOC4").
- `isWorkerPlacementValid(player, location, card)` (`shared/game-helper.ts`) checks: `!hasPlayedCard`, `currentNumberOfWorkers > 0`, location not taken, card covers `cost.districtIconIds`, and `canPayLocationCosts` (resources AND `cardsInHand` requirements for cost actions). It does NOT verify reward-action feasibility.
- The backlog claim "Wire into `shared/Game.ts:216` replace `return []`" - the real hook is `Game.ai.enumerate: (G, ctx) => { return []; }` near the end of `shared/Game.ts` (exact line drifts; locate by the `ai:` key, do not trust line 216).

### Game-integrity hazard (must shape `enumerate`)
`placeWorker` (`shared/services/moves/workerPlacementService.ts`) runs `playCard -> payCosts -> collectRewards -> claimLocation` and IGNORES the result of `actionRegistry.execute`. `actionRegistry.execute` (`shared/actions/action-registry.ts`) validates and silently no-ops on failure. Cost/reward actions `DISCARD`, `TRASH`, `BUY_CARD` require `params.cardIds` supplied via `moveParams` (`WorkerMoveParams.costParams` / `.rewardParams`). Therefore: emitting `placeWorker` at an input-requiring location WITHOUT valid `cardIds` does NOT raise `INVALID_MOVE` - it claims the location while skipping the cost = an illegal free claim the bot would exploit.

Consequence for **Stage A** (subtask 2): `enumerate` only emits `placeWorker` for locations whose cost AND reward actions need no user input (resource-only / `none` input). Use `actionRegistry.requiresInput(actionId)` to detect input-requiring actions. Locations with `DISCARD`/`TRASH`/`BUY_CARD` (e.g. all `getHighCouncil` "High Council" locations, "CONURBA Market", "ECO Market", "Bargain") are excluded in Stage A and re-enabled in **Stage B** by synthesizing `moveParams.cardIds` (subtask 12). The reducer's silent-failure bug is tracked separately (subtask 13).

---

## Tasks (ordered)

### 1. Add `enumerate` module - characterSelection + trivial phases  (S)
- File: `shared/ai/botEnumerate.ts` (new)
- Changes: export `enumerate(G: GameState, ctx: Ctx, playerID?: string)`. Switch on `ctx.phase`:
  - `characterSelectionPhase`: compute taken `characterId`s across `getPlayersList(G)`; for the acting player (`playerID ?? ctx.currentPlayer`) only if they have no `characterId`, emit `{ move: 'selectCharacter', args: [c] }` for each `c in Object.values(CharacterEnum)` not taken.
  - `combatPhase`: `[{ move: 'endRound', args: [] }]`.
  - `endGamePhase`: `[{ move: 'goToLobby', args: [] }]`.
  - `maintenancePhase` and unknown phase: `[]`.
- Acceptance: unit-tested in subtask 9 (character list correct; trivial phases return single move).

### 2. `enumerate` - mainPhase move generation  (M)
- File: `shared/ai/botEnumerate.ts`
- Changes: for `mainPhase`, acting player = `getCurrentPlayer({G,ctx})`:
  - If `!player.hasRevealed`:
    - `placeWorker` (Stage A): nested loop `d in 0..G.districts.length-1`, `l in 0..G.districts[d].locations.length-1`, `card in player.hand`; include `{ move:'placeWorker', args:[d,l,card] }` ONLY when `isWorkerPlacementValid(player, G.districts[d].locations[l], card)` AND the location has no input-requiring cost/reward action (helper `locationNeedsInput(location)` using `actionRegistry.requiresInput`). Stage B (subtask 12) lifts the `locationNeedsInput` exclusion by attaching synthesized `moveParams`.
    - `reveal`: always `{ move:'reveal', args:[] }`.
    - `pass`: include `{ move:'pass', args:[] }` ONLY if `player.hasPlayedCard` (mirrors the `pass` guard that returns `INVALID_MOVE` otherwise).
    - `draw`: include `{ move:'draw', args:[] }` ONLY if `!player.hasPlayedCard` AND `player.hand.length < DRAW_CAP` (introduce a small cap constant, e.g. 8, to stop MCTS looping on infinite draws; see Ambiguities).
  - Do NOT emit `selectCard` (it only sets a UI highlight; `placeWorker` takes the card directly - including it adds dead branches). Document this choice in code.
- Acceptance: subtask 9 asserts move lists for known `createTestGame` states; no emitted `placeWorker` targets an input-requiring location; `pass` absent before a placement.

### 3. Wire `enumerate` into the game  (S)
- File: `shared/Game.ts`
- Changes: import `enumerate` from `./ai/botEnumerate`; replace `ai: { enumerate: (G, ctx) => { return []; } }` with `ai: { enumerate: (G, ctx, playerID) => enumerate(G, ctx, playerID) }`.
- Acceptance: existing `shared/tests/mainPhase.test.ts` still green; new RandomBot harness (subtask 4) completes a game.

### 4. RandomBot full-game harness + test  (S)
- File: `shared/tests/botPlaythrough.test.ts` (new)
- Changes: drive a full game with `RandomBot` from `boardgame.io/ai` via the `Client` + `Local` path (or `Simulate`/`Step`), `numPlayers: 2`, using `createTestGame()` so decks are deterministic. Loop until `ctx.gameover` or a max-step guard.
- Acceptance: game reaches `gameover` with no `INVALID_MOVE` logged and no illegal free claims (assert every claimed location had its resource cost deducted, or simply assert resources never go negative).

### 5. `objectives` heuristic  (M)
- File: `shared/ai/botObjectives.ts` (new)
- Changes: export `objectives(G, ctx, playerID)` returning a record of `{ [name]: { checker:(G,ctx)=>boolean, weight:number } }` consumed by `MCTSBot`. Candidate objectives (boolean, weighted), all read-only over `GameState`:
  - `leadingVP`: acting player's `victoryPoints` is strict max among players.
  - `nearWin`: acting player's `victoryPoints >= G.config.victoryPoints - 1`.
  - `boardPresence`: acting player has presence in `>= 2` districts (`district.presence[playerID].amount > 0`).
  - `soloDistrict`: acting player is sole presence in `>= 1` district (would win combat).
  - `economy`: acting player holds `candy + loot` above table average.
- Tune weights so terminal win signal (reached via playout `gameover`) dominates; objectives only break ties when `playoutDepth` does not reach `gameover`.
- Acceptance: pure-function unit tests (subtask 9) for each checker on hand-built states.

### 6. MCTS bot factory  (M)
- File: `shared/ai/CandyMctsBot.ts` (new)
- Changes: export a factory `createCandyMctsBot(seed?)` returning `new MCTSBot({ game: Game, enumerate, objectives, seed, iterations, playoutDepth })`. Set `iterations` and `playoutDepth` as functions of `(G, ctx)`: cheap in `characterSelectionPhase`/`combatPhase`/`endGamePhase` (e.g. 50/10), deeper in `mainPhase` (start 300/40; tune). Keep `game: Game` so MCTS can step the real reducer.
- Acceptance: subtask 7 full game; bot beats RandomBot over N seeded games (subtask 10 metric).

### 7. MCTS full-game test + "no INVALID_MOVE" guarantee  (M)
- File: `shared/tests/botPlaythrough.test.ts` (extend)
- Changes: add a case driving 2 MCTS seats (or 1 MCTS vs 1 RandomBot) to `gameover` with bounded wall-time (cap iterations low for test speed).
- Acceptance: terminates, zero `INVALID_MOVE`, resources never negative, a `ranking` is produced.

### 8. Client "vs Bot" mode  (M)
- Files: `client/src/App.tsx`, `client/src/components/lobby-component/LobbyComponent.tsx`, `client/src/store.ts`
- Changes: add a "vs Bot" toggle in the lobby. When active, build the game `Client` with `multiplayer: Local({ bots: { '1': MCTSBot } })` (from `boardgame.io/multiplayer` / `boardgame.io/ai`) instead of the existing `SocketIO({ server: BACKEND_URL })` transport (`App.tsx` currently hardwires SocketIO via `useMemo`). Pass the bot's `enumerate`/`objectives` through `game: Game`.
- Constraint to surface: `Local()` runs entirely client-side, so vs-Bot games are NOT persisted by the server and will NOT appear in `/api/training-data`. If recorded bot games are required, a server-seated bot (headless `Client` joining a real match) is needed instead - out of scope here. See Ambiguities.
- Acceptance: manual playtest - full game vs bot in-browser, no `INVALID_MOVE`, game terminates and routes to end screen.

### 9. Enumerate + objectives unit tests  (M)
- File: `shared/tests/botEnumerate.test.ts` (new), mirroring `shared/tests/mainPhase.test.ts` style (Vitest + `boardgame.io/client` `Client` + `createTestGame`, `globals:true` per `shared/vitest.config.ts`).
- Cases (concrete):
  - `characterSelectionPhase`: fresh game -> `selectCharacter` emitted once per unclaimed `CharacterEnum` (4); after one player claims `ChillDudes`, that option is absent for the next acting player.
  - `mainPhase` initial (deterministic `createTestGame` hand `[SIGNET, D4, filler, D3, filler]`, 8 candy): asserts `placeWorker` includes `EASY_JOB (districtIdx 2, locationIdx 0)` with `D3_CARD` and `SWORD_MASTER (3,2)` with `D4_CARD`; asserts NO emitted `placeWorker` targets a High Council / Market location (input-required); asserts `pass` is ABSENT pre-placement and PRESENT after a placement; `reveal` always present; `draw` absent once `hasPlayedCard`.
  - `combatPhase`/`endGamePhase`: exactly `[endRound]` / `[goToLobby]`.
  - `objectives`: `leadingVP`/`nearWin`/`soloDistrict` checkers true/false on hand-built `GameState`.
- Acceptance: `npm run test -w @candyfight/shared` green.

### 10. Training-data export endpoint (deterministic replay)  (M)
- File: `server/server.ts` (modify); optional `shared/Game.ts` (add root `onEnd` stamp).
- Changes: add `GET /api/training-data` on `server.router`. Use `server.db` (`StorageAPI`) `listMatches`/`fetch(matchID, { initialState, log, metadata, state })` for `GAME_NAME` (`"project-district"`); filter to finished matches (`state.ctx.gameover` set); stream NDJSON records of shape:
  ```jsonc
  { "matchID": "...", "gameover": <state.ctx.gameover>, "ranking": <state.G.ranking ids>,
    "initialState": <initialState>, "log": <bgio internal action log> }
  ```
  Do NOT store a per-move `stateSnapshot` (research recommendation): persist `initialState` + `log` and reconstruct states at train time via deterministic replay. The stored `state.G` is the FULL server-side state (pre-`playerView`), so hidden hands are captured - keep it that way.
  Optional: add `Game.onEnd: ({G}) => { /* stamp G.finishedAt */ }` only if a cheap completion filter is wanted; otherwise rely on `ctx.gameover`.
- Acceptance: subtask 11 smoke test.

### 11. Recorder replay smoke test  (S)
- File: `server/` test (new) OR `shared/tests/recorderReplay.test.ts` if exercised in-process.
- Changes: play a full deterministic game to `gameover` in-process; capture `{ initialState, log }`; replay the `log` through the `Game` reducer starting from `initialState`; assert the replayed final `G` (VP, ranking) equals the recorded final `G`. (If the endpoint itself is tested, hit `/api/training-data` and assert >=1 NDJSON record with required keys.)
- Acceptance: replay reproduces final state exactly; endpoint returns the completed match.

### 12. Stage B - cost/reward `moveParams` synthesis for input-requiring locations  (L)
- File: `shared/ai/botEnumerate.ts` (extend); likely a helper `shared/ai/paramSynthesis.ts` (new).
- Changes: for locations whose cost/reward actions require input (`DISCARD`/`TRASH`/`BUY_CARD`), generate the `moveParams` (`WorkerMoveParams.costParams` / `.rewardParams`, carrying `cardIds`) so `enumerate` can emit a COMPLETE, legal `placeWorker`. Approach:
  - For each candidate location+card, inspect the required cost/reward actions and their input cardinality (how many cardIds, from which pool - hand vs board vs shop).
  - Synthesize candidate `cardIds` sets. To bound branching, do NOT enumerate every subset: emit a small number of heuristic choices (e.g. discard/trash the lowest-value card(s); buy the most VP-efficient affordable card). The exact value heuristic is a tuning detail - keep it pluggable.
  - Re-validate the fully-parameterized move (cost actually payable, reward actually applicable) before emitting, so a synthesized move never triggers the silent-failure path.
  - Remove the Stage A `locationNeedsInput` exclusion once synthesis covers a location class.
- Risks: this is the highest-branching, highest-complexity subtask; combinatorial blowup if subsets aren't capped; depends on subtask 13's reducer fix to fail loudly during testing.
- Acceptance: new tests assert (a) input-requiring locations now appear in `enumerate` with valid `moveParams`; (b) every emitted move is accepted by the reducer with the cost actually deducted (no illegal free claim); (c) a full MCTS game that uses at least one card-buying/discard location terminates with zero `INVALID_MOVE`.

### 13. Reducer fix - `placeWorker` must reject failed cost/reward actions  (M, independent)
- File: `shared/services/moves/workerPlacementService.ts` (and/or `shared/actions/action-registry.ts`).
- Changes: make `placeWorker` honor the result of `actionRegistry.execute`; if a required cost/reward action fails (e.g. missing/invalid `cardIds`), return `INVALID_MOVE` and do NOT claim the location. This closes the illegal-free-claim hole for ALL clients, not just the bot.
- Note: tracked as a game-rules bug independent of the bot; do this BEFORE Stage B so synthesized params are validated against a reducer that fails loudly. Confirm with human that changing this move's failure semantics doesn't break existing client flows.
- Acceptance: a `placeWorker` at an input-requiring location with missing `cardIds` returns `INVALID_MOVE` and leaves the location unclaimed and resources unchanged.

---

## Files to Modify
- `shared/Game.ts` - wire `ai.enumerate` to the new module (subtask 3); optional root `onEnd` stamp (subtask 10).
- `server/server.ts` - add `GET /api/training-data` (subtask 10).
- `client/src/App.tsx` - conditional `Local({ bots })` vs `SocketIO` transport (subtask 8).
- `client/src/components/lobby-component/LobbyComponent.tsx` - "vs Bot" toggle UI (subtask 8).
- `client/src/store.ts` - hold the vs-Bot flag / transport selection (subtask 8).

## New Files
- `shared/ai/botEnumerate.ts` - multi-phase valid-move enumeration.
- `shared/ai/paramSynthesis.ts` - Stage B cost/reward `moveParams.cardIds` synthesis (subtask 12).
- `shared/ai/botObjectives.ts` - MCTS `objectives` heuristic.
- `shared/ai/CandyMctsBot.ts` - `MCTSBot` factory with per-phase iteration/depth tuning.
- `shared/tests/botEnumerate.test.ts` - enumerate + objectives unit tests.
- `shared/tests/botPlaythrough.test.ts` - RandomBot + MCTS full-game, no-INVALID_MOVE.
- `shared/tests/recorderReplay.test.ts` (or server test) - deterministic replay smoke test.

(Deferred, do NOT create now: `shared/ai/featureExtractor.ts`, `shared/ai/botModel.ts`, `shared/ai/LearningBot.ts`, `ai-training/`.)

## Dependencies
- 2,3 depend on 1. 4 depends on 3. 5 -> 6 -> 7 (6 depends on 1-3 and 5). 8 depends on 6. 9 depends on 1,2,5. 10 independent of bot (depends only on game completion). 11 depends on 10.
- Stage B: 13 (reducer fix) SHOULD precede 12 (param synthesis); 12 depends on 1-2 and re-runs the bot tests (7) with input-requiring locations enabled.
- Recommended order: **Iteration 1 (Stage A ship)** 1 -> 2 -> 3 -> 4 -> 9 -> 5 -> 6 -> 7 -> 8, then 10 -> 11 in parallel. **Iteration 2 (Stage B)** 13 -> 12 -> re-verify 7/9.

## TDD test plan (concrete)
Runner: Vitest (`shared/vitest.config.ts`, `globals:true`, node env), invoked by `npm run test -w @candyfight/shared`. Mirror `shared/tests/mainPhase.test.ts` (uses `boardgame.io/client` `Client` + `createTestGame`).
1. `botEnumerate.test.ts` - per-phase move-list assertions (subtask 9 cases above), including the input-required exclusion and `pass`/`draw` guards.
2. `botPlaythrough.test.ts` - `bot plays a full game with no INVALID_MOVE` for RandomBot and MCTS; resources never negative; reaches `gameover` and produces `ranking`.
3. `recorderReplay.test.ts` - deterministic replay: `log` replayed from `initialState` reproduces final `G`; (optional) endpoint returns >=1 record with `{matchID, log, initialState}`.

## Acceptance criteria (per milestone)
- Enumerate: for every phase, every emitted move is accepted by the reducer (never `INVALID_MOVE`) and never produces an illegal free claim; trivial phases return exactly their single move.
- RandomBot: full game terminates, zero `INVALID_MOVE`.
- MCTS bot: full game terminates, zero `INVALID_MOVE`; over >=20 seeded 1v1 games, MCTS win-rate vs RandomBot is clearly > 50% (sanity floor).
- vs-Bot mode: in-browser game vs MCTS completes and routes to end screen.
- Recorder: `/api/training-data` returns finished matches as NDJSON with full `initialState`+`log`; replay reproduces the final state.

## Strength metric (research-aligned)
Do NOT use "win rate vs RandomBot after 50 games" as the success bar (RandomBot is a trivial floor and there is no learned model in this increment). Measure bot strength as win-rate of the candidate bot vs the current tuned `MCTSBot` baseline over a fixed seeded batch. Any future learned net must beat the tuned MCTS bot, not RandomBot, to justify itself.

---

## Plan deltas vs `backlog/ai-bot-plan.md`
1. PRIMARY deliverable changed from "MCTS as throwaway placeholder, neural net is the endgame" to "tuned `MCTSBot` + `objectives` IS the product." First increment = enumerate -> MCTS -> vs-Bot lobby (+ cheap recorder). (research adjustment 1)
2. Added `objectives(G,ctx,playerID)` - a first-class `MCTSBot` hook the backlog never mentions; it is the main quality lever. New file `shared/ai/botObjectives.ts`.
3. Behavioral cloning (backlog Phases 3-5: `featureExtractor.ts`, `ai-training/`, `botModel.ts`, `LearningBot.ts`, ONNX) is DEFERRED, not built. If a net is pursued later, target AlphaZero-lite self-play, not BC; BC is at most a warm-start. (research adjustment 2)
4. Recorder stores `initialState` + bgio move `log` for deterministic replay, NOT a per-move `stateSnapshot` (backlog's `moves[].stateSnapshot`). Cheaper and canonical; avoids train/serve state divergence. (research adjustment 3)
5. Success metric changed from "60% vs RandomBot after 50 games" to "win-rate vs the tuned MCTS baseline." (research adjustment 3)
6. Corrected the phase model: backlog lists 4 phases and omits `maintenancePhase`; the game has 5 (`characterSelectionPhase, maintenancePhase, mainPhase, combatPhase, endGamePhase`). Phase one-hot size etc. in any future feature work must be 5, not 4.
7. Corrected `placeWorker` args to NUMERIC indices `(districtIdx, locationIdx, card)`, not string IDs; corrected the `Game.ts` wiring guidance (locate the `ai:` key, not "line 216").
8. New, backlog-missing constraint: card-buying/discard/trash locations (DISCARD/TRASH/BUY_CARD) require `moveParams.cardIds`. Delivered in two stages - Stage A excludes them (subtask 2), Stage B synthesizes the params so they are usable (subtask 12, human-confirmed essential). Plus a reducer fix (subtask 13) so failed costs reject instead of silently claiming the location.
9. New, backlog-missing constraint: vs-Bot via `Local()` is client-side and unrecorded; recorder captures human SocketIO games only unless a server-seated bot is added.
10. Hidden-information: human-confirmed full-state PvE for v1; determinization specified as the Stage 2 upgrade path (de-cheating), a contained search-layer change, not a rewrite.

---

## Ambiguities for human

### Resolved
- **Hidden information** - RESOLVED: full-state PvE for v1; determinization = Stage 2 (see Resolved decisions + Deferred scope).
- **Input-requiring locations** - RESOLVED: option (b), two-stage (Stage A exclude -> Stage B synthesize); essential. Reducer silent-failure tracked as subtask 13.
- **`selectCard` omission** - RESOLVED by code: `placeWorker` (Game.ts) takes the card as an explicit arg and validates/plays THAT; it never reads `player.selectedCard`. `selectCard` is a UI-only highlight. Omitting it from `enumerate` is safe.
- **`draw` looping** - RESOLVED by code (confirmed real): the `draw` move draws exactly 1 card and has NO hand cap, NO `hasPlayedCard` guard, and does NOT end the turn (deck rebuilds from discard when empty) -> unbounded. There is no engine hand-size ceiling. Decision: `enumerate` offers `draw` only when `!player.hasPlayedCard` AND `player.hand.length < DRAW_CAP` (constant, default 8 - a bot heuristic, not a rule). Reconsider value during MCTS tuning (subtask 6/7).

### Open
3. Input-requiring locations: first increment SKIPS DISCARD/TRASH/BUY_CARD locations (High Council, Markets, Bargain). This removes the entire card-buying/economy line from the bot's options - acceptable for v1, or is auto-synthesis of `moveParams.cardIds` (pick lowest-value cards) required immediately? (Note: `placeWorker` ignoring failed cost execution is arguably a core bug worth fixing in the reducer regardless.)
4. `selectCard` omission from `enumerate` - confirm `selectCard` is purely a UI highlight and is not a precondition for any move (code review supports omission, but confirm no card effect path depends on `player.selectedCard`).
5. Recorder target: do we need bot games recorded? If yes, `Local()` vs-Bot will not satisfy it - decide between (a) human-games-only recording now, or (b) building a server-seated headless bot (extra scope).
6. Persistence/storage: the server currently uses boardgame.io's default storage (no explicit adapter in `server/server.ts`). Confirm `server.db` exposes `listMatches`/`fetch` with `{initialState, log}` in the deployed storage backend before relying on it for export.
7. MCTS tuning budget: target per-move think-time for the in-browser bot? This bounds `iterations`/`playoutDepth`. Long games + `placeWorker` branching (up to 4x4xhand) can be heavy; needs an empirical branching-factor measurement (the validation flags this as the key unmeasured variable).
8. `numPlayers` for vs-Bot: 1 human vs 1 bot only, or human + multiple bots filling a 3-4 seat match? Affects lobby UX and `Local({ bots })` seat mapping.
