# Beehive Game – Asset Size Guide (Recommended)

## Screen / Backgrounds
- **Master backgrounds:** 2048×1365 (ratio **3:2**)  
- **Game-ready backgrounds:** 1536×1024 (ratio **3:2**)  ✅ (included in `assets/backgrounds/standard_1536x1024/`)
- Keep *all* rooms and the Beehive entrance at the **same ratio** so your camera + UI layout doesn’t shift per scene.

## Pixel / Tile Baseline
Pick one of these (both work):
- **Tile = 16px** (classic pixel art grid)  
- **Tile = 32px** (easier for modern web scaling)

Everything below assumes **Tile = 32px** (you can divide by 2 if you choose 16px).

## Characters (Dadibee + Mamibee)
- **In-game displayed size:** ~**32×96 px** (≈ 1×3 tiles)  
- **Recommended source generation size:** **128×384 px** per frame (4× scale), then scale down to 32×96 in-engine.
- **Sprite sheet suggestion:**  
  - 6-frame walk: **(32×96)×6 = 192×96**  
  - 2-frame idle: **64×96**

## Jollibabees
- **In-game displayed size:** ~**48×64 px** (≈ 1.5×2 tiles)  
- **JolliBig:** scale **1.3×** in-engine (≈ 62×83 px)  
- **JolliBurrito (flying):** same base size but allow extra wing pixels above (still keep the box 48×64 if possible)
- **Recommended source generation size:** **192×256 px** per frame (4× scale), then scale down.

## Clickable Props (overlay objects)
Use **consistent bounding boxes** even if the object is smaller inside.
- **Small props:** 32×32 or 48×48 (phone, nail clippers, burger, whey bottle icon, remote)
- **Medium props:** 64×64 (vacuum, laundry basket, mirror, package, trash pile, clothes pile)
- **Large props (if needed):** 96×96 (closet/wardrobe overlay icon)

## UI / HUD
- **Icons (hearts, coins, followers):** 16×16 or 24×24
- **Buttons:** 160×48 (normal), with hover/pressed variants same size
- **Dialogue bubble:** 320×96 (plus optional 48×48 “tail” variants)
- **Pop-up frame (phone/temptation/computer call):** 480×320 (centered panel)

Tip: keep **UI scale separate** from world scale so it stays readable on phones.
