# Candy Fight — Rulebook (Implemented Ruleset)

> Scope: **only mechanics that the current engine actually executes.** Stubbed/planned
> mechanics (trackers, repair tokens, restricted-area special rules, strange candy,
> cooldown, "deal") are intentionally **excluded** — see the "Not in this ruleset" note
> at the end. This document is the ground truth for the tutorial.
>
> Source of truth: `shared/Game.ts`, `shared/game-helper.ts`,
> `shared/services/moves/*`, `shared/services/locationServices.ts`,
> `shared/actions/core-actions.ts`, `shared/characters/character-definitions.ts`.

---

## 1. Objective

Be the first to reach the **Victory Point (VP) target** (default **6 VP**, configurable
per match). The moment a player reaches it, the current round finishes resolving and the
game ends. Final ranking tiebreak order: **VP → candy → loot** (descending).

## 2. Components (per player)

- **2 resources:** `candy` and `loot`. Each player starts with **2 of each** (configurable).
- **2 workers** (`maxNumberOfWorkers` starts at 2). The Sword Master location can raise this.
- A **10-card starting deck**:
  - **1 Signet** — fires your character's Signet ability when played.
  - **4 single-district cards** — one for each district (carry an *add presence* effect).
  - **2 dual-district cards** — cover two districts.
  - **2 Strange Candy** — grant **+1 loot** when played.
  - **1 Cooldown**.
- A **discard pile** and a **trash pile** (trashed cards leave the deck permanently).

## 3. The Board

Four **districts**, each with a handful of **locations**:

| District | Theme | Notable locations |
|----------|-------|-------------------|
| **Conurbaplex** | Industrial core | Market (buy card), High Council, *Time for Candy* (+1 candy) |
| **Ecoplex** | Decaying biodome | Market (buy card), *Momentum* |
| **Streets** | Open chaos | *Easy Job* (+1 loot), *Bargain* (+2 loot) |
| **AGI Control Zone** | Machine stronghold | High Council, *Time is Gold* (draw), *Sword Master* (extra worker) |

Each district also tracks **presence tokens** per player — presence is how you win the
district in combat.

## 4. Game Flow

A game is a loop of rounds. Each round runs four phases in order:

```
Character Selection (once)  →  ┌─ Maintenance ─ Main ─ Combat ─┐
                               └──────── loop until win ───────┘
```

### 4.1 Character Selection (once, at game start)

Each player picks a **unique character**. No two players may share one.

| Character | Signet ability (fires when the Signet card is played) |
|-----------|--------------------------------------------------------|
| **Chill Dudes** | Draw 1 card **+ gain 1 loot** |
| **Kawaiisis** | Gain 2 candy **+ 1 extra presence** in the played location's district |
| **Street Wizards** | Gain 3 loot |
| **Tech Bros** | Draw 2 cards **+ gain 1 candy** |

### 4.2 Maintenance Phase

Automatic upkeep at the start of every round:

1. Workers refill to your maximum.
2. The board resets — **all presence tokens clear** and every location is freed.
3. Every player **draws back up to a 5-card hand**.

### 4.3 Main Phase (the heart of the game)

Players take turns in rotation. Turn order rotates each round, and **already-revealed
players are skipped**. On **your turn** you may:

- **Draw** a card from your deck (optional).
- **Place a worker** — your main action (see §5). One worker placement per turn.
- **Pass** — end your turn but stay in the round (only allowed after you've played a card).
- **Reveal** — **end your participation in the round.** You take no more turns this round.

You hold **2 workers**, so across your turns you can place up to two workers before you
run out (or before you choose to reveal). When **every player has revealed**, the Main
Phase ends.

### 4.4 Combat Phase

For **each of the four districts**, the player with the **most presence tokens** wins the
district and scores **+1 VP**. A **tie for the lead = no winner** (no VP awarded). With
four districts, up to **4 VP** are available per round.

Then all hands are discarded. If a player has reached the VP target → **End Game**;
otherwise the loop returns to Maintenance.

### 4.5 End Game

Final ranking is computed (VP → candy → loot). Highest wins.

## 5. Placing a Worker (core action, step by step)

This is the action you'll perform most. The pipeline (`placeWorker`):

1. **Select a card** from your hand.
2. **Choose a location** whose **district icon** appears in the card's districts. (A
   single-district card only opens that district's locations; a dual-district card opens two.)
3. **Pay the cost.** Costs are either:
   - **Resources** — spend candy and/or loot, or
   - **Card costs** — *discard* or *trash* a number of cards from hand.
   You may only choose a location whose cost you can fully pay.
4. **Resolve the card + location reward.** The card's effect fires (e.g. *add presence*,
   *+1 loot*), then you collect the location's reward (resources, draw, buy a card, etc.).
5. **Claim the location & gain presence.** The card is discarded, the location is now
   yours (no one else can use it this round), and you gain **+1 presence** in that district.

> **Presence stacks fast:** claiming a location is always +1 presence, and the single-
> district cards *also* carry an *add presence* effect — so playing one of those at a
> location grants **+2 presence** in that district. Kawaiisis' Signet adds another.

## 6. Resources & Deckbuilding

- **Candy** and **loot** are spent on location costs and earned from location/card rewards.
- **Markets** (Conurbaplex, Ecoplex): pay by **trashing 2 cards**, then **buy a card** from
  the market row into your discard pile — thinning weak cards and adding stronger ones.
- **Sword Master** (AGI Control Zone): pay **4 candy** to gain a **permanent extra worker**
  (raises both current and max workers). Disabled once you reach 3 max workers.

## 7. Winning

Win district combats to bank VP. First to the **VP target (6)** ends the game after the
round resolves. Presence is the currency of victory — every claimed location and every
presence effect is a vote toward owning that district at Combat.

---

## Not in this ruleset (stubbed / planned — excluded by decision)

The following appear in the data model but have **no implemented effect** today and are
**not taught**: High Council "Advance Tracker", Repair Tokens, Strange Candy Puzzle,
Cooldown effect, Ecoplex "Deal", and any special **Restricted Area / dominance** rules
(Restricted Areas currently behave as presence-only slots with no reward).
