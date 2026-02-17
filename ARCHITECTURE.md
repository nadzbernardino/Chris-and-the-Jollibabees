

# Architecture

## Goals
- Deterministic mechanics (state machine + pure stat reducers).
- Level-based structure (Mario feel) without physics complexity.
- Mobile-first UI + performance.
- Easy for AI + humans to resume after interruptions.

---

## Tech Stack
- Phaser 3 (rendering + scenes)
- TypeScript (safety)
- Vite (dev/build)
- Simple asset pipeline (sprites, audio)

---

## Core Concepts

### 1) Scene Flow (Phaser Scenes)
Each “screen” is a Phaser Scene:
- IntroScene
- WorldMapScene
- LevelScene (param-driven for L1–L6)
- MarketScene
- SleepScene
- FinalPickupScene
- EndingScene
- GameOverScene

We avoid having many different codepaths; we reuse templates.

### 2) Game Store (Single Source of Truth)
A global `GameStore` holds:
- stats (Preparation, Integrity, etc.)
- progression (unlocked levels, completed levels)
- flags (HasRing, whaleUsedThisLevel, marketAvailable)
- current run metadata

### 3) Reducers (Pure Functions)
All stat changes happen through pure reducers:
- `applyTaskResult(taskId, store)`
- `applyWhaleCoin(choice, roll, store)`
- `applyMarketPurchase(item, store)`
- `applyDarmeshChoice(choice, store)`
- `applySleep(store)`
These reducers clamp values.

### 4) RNG Wrapper
Use `rng.next()` wrapper so:
- deterministic seeds possible for debugging
- easy to test whale outcomes

### 5) UI Layer
HUD and popups are UI components:
- HUD (hearts, diamonds, prep/energy bars, timer)
- Popup (Whale coin, Doom scroll, AVOID prompt, Darmesh call)
- Speech bubbles for Jollibabees

Speech bubbles are disabled during modal states.

---

## File Layout (expected)
- `src/main.ts` — boot Phaser + initial scene
- `src/game/config.ts` — game config, dimensions, constants
- `src/game/store/GameStore.ts` — store + getters/setters
- `src/game/store/reducers/*` — all mechanics reducers
- `src/game/scenes/*` — Phaser scenes
- `src/game/ui/*` — HUD, popups, speech bubbles
- `src/game/levels/*` — level definitions (objectives, timers, hazards)
- `src/assets/*` — sprites, audio, fonts
- `CLAUDE.md` — mechanics spec

---

## Level Implementation Approach
Levels are defined as data, not bespoke code:
`LevelDef` includes:
- id, title
- timerSeconds
- objective type + params (e.g., tapCount=5)
- hazards schedule (pig avoid prompts, doom scroll timing)
- whaleCoinPolicy (off/on/forced)
- rewards (base stat changes)

`LevelScene` reads `LevelDef` and renders the mini-interactions accordingly.

---

## Publishing
Build produces static assets for hosting (Vercel/Netlify/GH Pages).
Mobile QA checklist:
- tap targets
- no hover
- audio unlock on first interaction
- performance on iPhone Safari/Chrome
