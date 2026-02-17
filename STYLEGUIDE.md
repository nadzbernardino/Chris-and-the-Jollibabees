# STYLEGUIDE.md — Woodland Preparation Quest

Visual and audio style guide for the cottage-fantasy 8-bit game.
All constants live in `src/game/uiTheme.ts`.

---

## Palette

| Role           | Hex       | Swatch                       |
|----------------|-----------|------------------------------|
| Dark Pine      | `#1F3B2C` | Background / deep shadows    |
| Forest Green   | `#2F4F3E` | Modal panels                 |
| Moss Green     | `#3F6B4F` | Success accents              |
| Dark Wood      | `#3F2A14` | Borders / button outlines    |
| Wood           | `#5C3A21` | Button idle fill             |
| Light Wood     | `#7A4E2D` | Button hover / highlights    |
| Warm Brown     | `#8B5E34` | Button pressed               |
| Champagne      | `#E8B45E` | Gold accent                  |
| Gold           | `#F4C76A` | Titles / heading text        |
| Warm Gold      | `#FFE4B5` | Progress labels              |
| Ivory          | `#F5F2EA` | Body text / button labels    |
| Parchment      | `#EEE4C8` | Speech bubble fill           |
| Dark Text      | `#3A2A14` | Bubble text (dark on light)  |
| Mist           | `#6D8C8A` | Subtle atmosphere accents    |
| Champagne Glow | `#E6C98B` | UI sparkle / glow            |
| Heart Red      | `#E84040` | Hearts / HUD                 |
| Danger         | `#FF6666` | Countdown / warnings         |
| Success        | `#6AB04C` | Positive feedback            |

---

## Typography

**Font:** [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (Google Fonts)

Loaded via `<link>` in `index.html`. Fallback: `"Courier New", monospace`.

| Style       | Size   | Color      | Stroke | Usage                     |
|-------------|--------|------------|--------|---------------------------|
| `title`     | 36–42px | Gold       | Dark Wood 6px | Intro title, end screen |
| `heading`   | 18px   | Gold       | Black 4px     | Modal titles, labels    |
| `body`      | 13px   | Ivory      | Black 3px     | Modal body, story text  |
| `bubble`    | 12px   | Dark Text  | —             | Speech bubbles          |
| `button`    | 13px   | Ivory      | Black 3px     | Button labels           |
| `small`     | 9px    | Warm Gold  | Black 3px     | Follower names, labels  |
| `hud`       | 16px   | Heart Red  | Black 4px     | HUD hearts / timer      |
| `instruction`| 14px  | Warm Gold  | Black 4px     | Minigame headers        |

All styles defined in `TEXT` object in `uiTheme.ts`.

---

## UI Components

### Speech Bubble (`SpeechBubbleNew.ts`)
- Parchment fill (`#EEE4C8`) + Light Wood border (`#7A4E2D`)
- 8px rounded corners
- Down-pointing tail (14px)
- Pop-in animation: scale 0→1, Back.easeOut, 220ms
- Pop-out: scale 0.8 + fade, 160ms
- Auto-wraps at 340px max width
- Clamped to viewport so it never goes off-screen
- Auto-hides after duration (default 2500ms)

### Modal (`ModalManager.ts`)
- Full-screen blocker (black, 60% opacity) — absorbs all input
- Forest Green panel with Light Wood border + inner dark inset
- Wood plaque style via `drawPlaque()` helper
- Cannot be dismissed by clicking outside
- Buttons use wood plaque style with hover/press states
- Pop-in: scale 0.85→1, Back.easeOut

### Buttons (programmatic — no sprites)
- `drawPlaque()` renders rounded rect with border + inner highlight
- States: idle (Wood fill), hover (Light Wood + scale 1.03), pressed (Dark Wood + scale 0.96)
- Minimum 260×56px (≥44 CSS px on mobile)
- Presets: `BTN.idle`, `BTN.success`, `BTN.danger`, `BTN.hover`, `BTN.pressed`

### HUD (`HUDNew.ts`)
- **Top-left:** 3 pixel hearts drawn via Graphics (5×5 pixel grid, 28px each)
  - Filled = Heart Red with pink shine highlight
  - Empty = dark grey
- **Top-right:** Elapsed timer (mm:ss) in Warm Gold pixel font
- Fixed to camera (scrollFactor 0), depth 600

### Nav Arrows
- Dark Pine bg (70% opacity) + Gold border
- Pixel font "◀" / "▶" in Gold
- 60×84px hit area

---

## Audio Hooks

All hooks are in `AudioManager.ts`. Drop `.ogg`/`.mp3` files into `src/assets/audio/`.
If a file is missing, the system logs a warning and continues.

| Hook              | Key               | When it fires                     |
|-------------------|-------------------|-----------------------------------|
| `btnClick()`      | `btn_click`       | Any button tap                    |
| `taskStart()`     | `task_start`      | Task begins                       |
| `taskComplete()`  | `task_complete`   | "That task is done" moment        |
| `heartGain()`     | `heart_gain`      | +1 heart                          |
| `heartLose()`     | `heart_lose`      | -1 heart                          |
| `popupOpen()`     | `popup_open`      | Modal opens                       |
| `popupClose()`    | `popup_close`     | Modal closes                      |
| `pigAlert()`      | `pig_alert`       | Temptation pig appears            |
| `whaleCoin()`     | `whale_coin`      | Whale coin popup appears          |
| `vacuumSuction()` | `vacuum_suction`  | Vacuum minigame loop              |
| `waterSplash()`   | `water_splash`    | Bonsai watered                    |
| `doorOpen()`      | `door_open`       | Exit door opened                  |
| `endingChime()`   | `ending_chime`    | Ending fanfare                    |
| `jollibabeeFound()` | `jollibabee_found` | New jollibabee discovered       |
| `startAmbient()`  | `ambient_cottage` | Soft forest/cottage BGM loop      |

---

## Assets Checklist (What to Generate)

### Must-have
| Asset                    | Size / Format   | Notes                         |
|--------------------------|-----------------|-------------------------------|
| `pixel_heart.png`        | 28×28 px        | Optional — currently drawn via Graphics |
| `ui_panel_wood.9.png`    | 64×64 9-slice   | Wood plaque panel for modals  |
| `speech_bubble.9.png`    | 48×48 9-slice   | Parchment bubble frame        |
| `exit_door_room_bg.png`  | 1536×1024       | Exit door room background     |
| `btn_click.ogg`          | SFX <1s         | Button tap click              |
| `task_complete.ogg`      | SFX 1–2s        | Task done jingle              |
| `heart_gain.ogg`         | SFX <1s         | Heart sparkle                 |
| `heart_lose.ogg`         | SFX <1s         | Heart thud                    |
| `ambient_cottage.ogg`    | Music ~60s loop | Soft forest/cottage BGM       |

### Nice-to-have
| Asset                    | Size / Format   | Notes                         |
|--------------------------|-----------------|-------------------------------|
| `sparkle_particle.png`   | 8×8 px          | For task completion particles |
| `popup_open.ogg`         | SFX <0.5s       | Whoosh                        |
| `popup_close.ogg`        | SFX <0.5s       | Soft close                    |
| `water_splash.ogg`       | SFX 1s          | Bonsai watering               |
| `pig_alert.ogg`          | SFX 1s          | Temptation pig appear         |
| `ending_chime.ogg`       | SFX 3s          | Ending fanfare                |
| `door_open.ogg`          | SFX 1s          | Door creak                    |
| `vacuum_suction.ogg`     | Loop 2s         | Vacuum minigame               |

### Missing Props (detected from code)
All current props exist as PNG files. If any show as magenta placeholders at runtime, generate:
- Size: ~128–256px per side
- Style: flat 8-bit pixel art, warm woodland palette

---

## Design Resolution
- **1536 × 1024** — Scale.FIT + CENTER_BOTH
- `pixelArt: true` — Nearest-neighbor filtering
- Canvas CSS: `image-rendering: pixelated`
