# House Overworld Style Guide

> Visual direction for the World Map. **Does not change any mechanics in CLAUDE.md.**

---

## Core Concept

The overworld is a **side-scrolling cutaway of a house interior** (cross-section view, like a dollhouse with the front wall removed). Chris walks left/right through rooms. The camera follows horizontally, keeping the current room centered.

There is no outdoor world map. Everything happens inside the house.

---

## Room Layout (Left → Right)

```
┌─────────┬──────────┬─────────────┬──────────┬───────────────────┬──────────────┬───────────┐
│ KITCHEN │ ENTRYWAY │ LIVING ROOM │  OFFICE  │ BATHROOM /        │   BEDROOM    │  LAUNDRY  │
│  (L1)   │  (L2)    │   (L3)      │  (L4)    │ PLANT CORNER (L5) │ (Sleep gate) │   (L6)    │
└─────────┴──────────┴─────────────┴──────────┴───────────────────┴──────────────┴───────────┘
                                                                                        │
                                                                              ┌─────────────────┐
                                                                              │   FRONT DOOR    │
                                                                              │ (Final Pickup)  │
                                                                              └─────────────────┘
```

| Room                  | Level / Gate         | Level Name (CLAUDE.md)       |
|-----------------------|----------------------|------------------------------|
| Kitchen               | Level 1              | Dish Cavern                  |
| Entryway              | Level 2              | Trash Run Trail              |
| Living Room           | Level 3              | Doomscroll Swamp             |
| Office                | Level 4              | Darmesh's Clearing           |
| Bathroom/Plant Corner | Level 5              | Garden + Groom               |
| Bedroom               | Sacred Sleep (gate)  | Sacred Sleep                 |
| Laundry Room          | Level 6              | Laundry Woods                |
| Front Door            | Final Pickup (gate)  | Final Pickup                 |

---

## Navigation

- Chris walks left/right along the hallway that connects all rooms.
- Each room has a **doorway or sign** that acts as the level node.
- Approaching a doorway shows its name + lock/clear status.
- Tapping the doorway enters the level (same scene transition as current WorldMapScene → LevelScene).
- Locked doorways are visually dimmed/chained.
- Completed doorways have a small checkmark or green glow.

---

## Camera

- Side-scrolling horizontal camera, clamped to house bounds.
- Camera follows Chris smoothly; rooms scroll in and out of view.
- Parallax is minimal (maybe a slight shift on background wall details).

---

## House Progression (Visual Updates)

After each completed level the house visually improves:

| Levels Done | House State                                                       |
|-------------|-------------------------------------------------------------------|
| 0           | Dim, messy. Dishes piled, trash visible, lights off.              |
| 1–2         | Kitchen clean, entryway tidied. One warm lantern on.              |
| 3–4         | Living room decluttered, office organized. More lanterns.         |
| 5           | Plants watered, bathroom sparkles. Warm amber glow.              |
| Sleep done  | Bedroom cozy, soft light. House feels almost ready.              |
| 6           | Laundry folded. Whole house bright and welcoming.                |
| Pickup      | Front door glows gold. "Ready."                                  |

This is purely cosmetic — no stat changes from visual upgrades.

---

## Woodland Vibe (Kept)

The house sits in a forest. The woodland aesthetic is preserved through:

- **Windows** in every room show forest trees, mist, and soft green light outside.
- **Interior palette** uses the same earthy/wood tones from CLAUDE.md (wood panels, carved trim).
- **Warm lantern lighting** replaces the forest-canopy dappled light.
- **Carved wood HUD** panels, vine-wrapped progress bars, parchment bubbles — all unchanged.
- **Forest Pigs** appear as silhouettes visible through windows or reflected in mirrors.
- Character color (red sprites against earthy background) stays the same.

---

## Jollibabees on the Overworld

- All 6 Jollibabees follow Chris through the house, trailing behind him.
- They bob, bump into each other, and randomly comment via speech bubbles.
- Speech bubbles work identically on the overworld and inside levels.
- Speech **pauses** during modals (Whale Coin popup, Market, Ending) — same rule as CLAUDE.md.

---

## Level Nodes (Doorway Interaction)

Each doorway shows:

1. **Room name** (pixel text above the door).
2. **Lock state icon** — padlock if locked, checkmark if cleared.
3. **Glow** — warm champagne glow on unlocked-but-not-yet-played doors.
4. **Tap target** — the door itself is the tap target (minimum 44px as per mobile rules).

Special nodes:
- **Bedroom** — shows a crescent moon icon. Only interactable between L5 and L6.
- **Front Door** — shows a key icon. Only interactable after all 6 levels + sleep.
- **Market** — appears as a small pop-up cart/table near the Entryway (after L2) or Plant Corner (after L5), not a separate room.

---

## What This Document Does NOT Change

- All stats, reducers, timers, failure conditions, endings — unchanged.
- Scene flow (Intro → WorldMap → Level → Market/Sleep → FinalPickup → Ending → GameOver) — unchanged.
- Level objectives, hazards, rewards — unchanged.
- Jollibabee dialogue lines and speech pause rules — unchanged.
- HUD components and UI system — unchanged.

This document only reframes the **visual metaphor** of the World Map from an abstract node map to a side-scrolling house interior.
