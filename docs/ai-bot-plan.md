# Candy Fight — AI Bot Plan

## Context
The goal is an AI that **learns from recorded games** rather than being hand-coded. The game already has a `G.log` system and a boardgame.io server with persistent storage. We'll build a pipeline: record games → extract winning strategies → train a small neural net → run it as the bot's decision engine.

This is **imitation learning / behavioral cloning**: the model learns to imitate what winning players did, given the same game state.

---

## Architecture Overview

```
[Game sessions] → [Recorder] → [Game logs in DB]
                                      ↓
                              [Python training pipeline]
                                      ↓
                              [ONNX model file]
                                      ↓
                    [boardgame.io bot uses model for move scoring]
```

---

## Approach: MCTS first, Neural Net later

| Dimension | Neural Net (ONNX) | MCTS |
|---|---|---|
| **Speed** | Very fast inference (~1ms) | Slow — needs 500–2000 simulations per move |
| **Build complexity** | High — feature engineering, Python pipeline | Low — just fill in `enumerate` |
| **Cold start** | Broken until ~50+ games recorded | Works day one |
| **Quality ceiling** | Very high — improves continuously | Limited by heuristic function |

**Recommended strategy**: Build MCTS first (playable immediately), record games from day one, introduce the neural net once enough data exists. The recorder costs almost nothing to build and the data compounds over time.

---

## Phase 1 — boardgame.io `enumerate` (prerequisite for any bot)

**New file:** `shared/ai/botEnumerate.ts`

Returns all valid moves for the current phase. Required by boardgame.io's bot API.

Per phase:
- `characterSelectionPhase` → `selectCharacter(id)` for each unclaimed `CharacterEnum`
- `mainPhase` → `draw`, `selectCard(card)` per hand card, `placeWorker(dId, lId, card)` per valid combo (via `isWorkerPlacementValid` @ `game-helper.ts:71`), `reveal`, `pass`
- `combatPhase` → `endRound`
- `endGamePhase` → `goToLobby`

Wire into `shared/Game.ts:216`: replace `return []` with `return enumerate(G, ctx)`

---

## Phase 2 — Game recorder (server-side)

boardgame.io's server stores match state in `server.db`. We persist **completed game logs** via an `onEnd` hook and expose them through a server endpoint.

```
GET /api/training-data   → returns all completed game records as NDJSON
```

Each record shape:
```jsonc
{
  "matchId": "abc123",
  "winnerId": "2",
  "ranking": [...],
  "moves": [
    { "playerID": "2", "phase": "mainPhase", "move": "placeWorker",
      "stateSnapshot": { ... },
      "args": [districtID, locationID, card] }
  ]
}
```

Files to modify:
- `server/server.ts` — add the export endpoint
- `shared/Game.ts` — add `onEnd` hook to finalize log

---

## Phase 3 — Feature engineering

**New file:** `shared/ai/featureExtractor.ts`

Converts `GameState` → flat `Float32Array` (~80 features):

| Feature group | Size | Notes |
|---|---|---|
| Current player: VP, candy, loot, workers | 4 | Normalized |
| Current player: hand card district icons | N_districts | Bag-of-words count |
| Each district: presence per player (×4 players) | districts × 4 | |
| Each district: locations taken ratio | districts × 1 | |
| Phase one-hot | 4 | character / main / combat / end |
| Round counter | 1 | Normalized |

---

## Phase 4 — Python training pipeline

**New directory:** `ai-training/`

```
ai-training/
  train.py          # loads game logs, trains model, exports ONNX
  features.py       # mirrors featureExtractor.ts in Python
  model.py          # small feedforward net (2-3 hidden layers)
  requirements.txt  # torch, onnx, numpy, requests
```

Training target (behavioral cloning):
- Label each move: `reward = 1.0` if the player won, `0.0` if they lost (or use ranking position 1→1.0, 4→0.0)
- Policy head: `state_vector → softmax over move types`
- Value head: `state_vector → win probability`

Model architecture:
```
Input (80) → Dense(128, ReLU) → Dense(64, ReLU) → Dense(32, ReLU)
    → policy head: Dense(N_moves, softmax)
    → value head:  Dense(1, sigmoid)
```

Export as `model.onnx`.

---

## Phase 5 — ONNX inference in the bot

**New files:** `shared/ai/botModel.ts`, `shared/ai/LearningBot.ts`

Uses `onnxruntime-node` to load `model.onnx` and score moves from `enumerate`.

```typescript
import * as ort from 'onnxruntime-node';
const session = await ort.InferenceSession.create('./model.onnx');

export async function scoreMoves(G, ctx, moves) {
  const input = extractFeatures(G, ctx);
  const { policy } = await session.run({ input });
  return moves.map((m, i) => ({ move: m, score: policy.data[i] }));
}
```

`LearningBot` extends boardgame.io's `Bot`, overrides `play()` to call `scoreMoves` and pick the highest-scored valid move.

---

## Phase 6 — Client "vs Bot" mode

Add a "vs Bot" toggle in the lobby. When active:
- Use boardgame.io's `Local()` transport
- Wire `LearningBot` (or fallback `MCTSBot` before model is trained) into the unused player seat

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `shared/ai/botEnumerate.ts` | Create | Valid move enumeration for all phases |
| `shared/ai/featureExtractor.ts` | Create | GameState → Float32Array feature vector |
| `shared/ai/botModel.ts` | Create | ONNX model loader + move scorer |
| `shared/ai/LearningBot.ts` | Create | boardgame.io bot using model predictions |
| `shared/Game.ts` | Modify | Wire enumerate, add `onEnd` recording hook |
| `server/server.ts` | Modify | Add `/api/training-data` export endpoint |
| `ai-training/` | Create | Python training pipeline |
| `client/src/` (lobby) | Modify | Add "vs Bot" toggle |

---

## Iteration Strategy

1. **Sprint 1**: `enumerate` + `RandomBot` → playable vs bot immediately
2. **Sprint 2**: Recorder + export endpoint → collecting real game data
3. **Sprint 3**: Python training pipeline → first `model.onnx` from human games
4. **Sprint 4**: ONNX inference → `LearningBot` replaces `RandomBot`
5. **Sprint 5+**: Retrain periodically as more games are recorded (flywheel)

---

## Verification

1. **Enumerate unit tests** (Vitest) — known G/ctx snapshots → assert correct move lists
2. **Recorder smoke test** — play a full game, call `/api/training-data`, assert record is present
3. **Training smoke test** — run `train.py` on 10 mock logs, assert `model.onnx` produced with correct shape
4. **Bot playtest** — vs Bot mode, full game, assert no INVALID_MOVEs and game terminates
5. **Learning check** — after 50+ real games, bot win rate vs `RandomBot` should exceed 60%
