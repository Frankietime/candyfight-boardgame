# Candy Fight

**Candy Fight** is a **web-based multiplayer board game** that blends **worker placement**, **deck building**, and **political control** mechanics.  
Inspired by *Dune: Imperium* and *Rise of Ix*, it reimagines strategic conflict within a **psychedelic dystopia**, where intelligence, addiction, and influence determine survival.

Built with **TypeScript**, **React**, and **boardgame.io**, the game aims to reproduce the depth of a modern tabletop experience in an interactive online format.

---

## 🌀 Setting

In the world of **Candy Fight**, players embody individuals emerging from a collapsing social network — rogue strategists, technocrats, or mystics — seeking to establish a new **faction of influence** across the fragmented city districts.  
Each decision expands control, harvests scarce resources, and forges alliances in an unstable system where every action has political and economic weight.

---

## ⚙️ Overview

Candy Fight is an **npm monorepo** with three main workspaces:

```
/client   → React front end  
/server   → boardgame.io + Koa backend  
/shared   → shared game logic and types
```

---

## 🏗️ Architecture

- **Shared Engine:** Centralized TypeScript core defining game state, phases, moves, and resource systems.  
  - Game loop: `maintenance → main → combat → endGame`  
  - Cost/Reward Engine and atomic Moves system (`draw`, `discard`, `trash`, `addPresenceToken`, etc.)  
  - Districts, cards, and resources defined through extensible enums and modular services  

- **Client:** React + Zustand + Radix UI + NES.css  
  - `LobbyComponent` for match creation and management  
  - `BoardComponent` for responsive map scaling and action orchestration  
  - `PlayerAreaComponent` for hand management and worker allocation  
  - Real-time synchronization through Socket.IO  

- **Server:** Node.js + Koa + boardgame.io

---

## 🧩 Core Mechanics

| Mechanic | Description |
|-----------|-------------|
| **Worker Placement** | Assign workers to district slots to gain resources, execute effects, or trigger political control. |
| **Deck Building** | Acquire and refine cards that expand influence, combat strength, and tactical reach. |
| **Political Control** | Establish dominance over city districts to earn strategic bonuses and victory points. |
| **Resource Economy** | Manage multiple currencies — candy (cognitive drug), loot (material assets), and social presence — through the cost/reward engine. |

---

## 🌆 Districts and Resources

The game world is divided into **four major districts**, each representing a fragment of civilization and its power structures:

| District | Description |
|-----------|--------------|
| **Conurbaplex** | Industrial core where infrastructure and production are controlled through worker influence. |
| **Ecoplex** | The decaying biodome where remnants of ecological technology can be reactivated for strategic advantage. |
| **Streets** | Chaotic open zones where agents fight for survival and temporary resources. |
| **AGI Control Zone** | The last stronghold of artificial governance — a dangerous area that grants immense cognitive power. |

Resources are intertwined with the **psychedelic dystopia** setting — energy, influence, and synthetic matter circulate as both currencies and addictions.  

---

## 🧪 Development Status

✅ **Implemented:**  
Core game loop, multiplayer sync, cost/reward logic, responsive UI, match management, combat resolution

🚧 **In Progress:**  
expanded market, animation layer  

🔜 **Planned:**  
Persistent user sessions, audio/soundscape integration

---

## 🧠 Tech Stack

| Layer | Technologies |
|--------|---------------|
| Game Logic | TypeScript + boardgame.io |
| Frontend | React + Zustand + Radix UI + NES.css |
| Backend | Node.js + Koa |
| Build Tools | Vite, ESLint, Prettier |

---

