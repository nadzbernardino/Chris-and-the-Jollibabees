# Project Map (Where to Change Things)

## Start Here
- `CLAUDE.md` — mechanics and level flow (authoritative)

## If you need to change game rules:
- `src/game/store/reducers/`
  - Whale coin: `applyWhaleCoin.ts`
  - Market: `applyMarketPurchase.ts`
  - Darmesh: `applyDarmeshChoice.ts`
  - Sleep: `applySleep.ts`
  - Level completion rewards: `applyLevelResult.ts`

## If you need to change levels:
- `src/game/levels/levelDefs.ts`
  - timers
  - objectives
  - hazards per level
  - whale coin forced in Level 3
  - market unlock after Level 2 and 5
  - sleep required before Level 6

## If you need to change progression (Mario style):
- `src/game/store/GameStore.ts`
- `src/game/scenes/WorldMapScene.ts`

## If buttons/taps aren’t working on mobile:
- `src/game/ui/Controls.ts`
- `src/game/ui/Clickable.ts`
- Ensure all interactions are pointer events (Phaser input).

## If popups overlap or speech happens during modals:
- `src/game/ui/ModalManager.ts`
- `src/game/ui/JollibabeeSpeech.ts`
- Rule: speech disabled when `store.ui.modalOpen === true`

## If art/UI needs updates:
- Palette + constants: `src/game/config.ts`
- HUD skin: `src/game/ui/HUD.ts`
- Speech bubble style: `src/game/ui/SpeechBubble.ts`

## If audio is missing or too loud:
- `src/game/audio/AudioManager.ts`
- Sound IDs + volumes: `src/game/audio/sfx.ts`

## If you want to adjust endings:
- `src/game/scenes/EndingScene.ts`
- thresholds:
  - Integrity < 40
  - Integrity 40–70
  - Integrity > 70 AND HasRing

## If restart doesn’t reset properly:
- `src/game/store/resetRun.ts`
- `GameOverScene` restart handler

## Quick Debug Checklist
1) Wrong startup scene? → `src/main.ts` initial scene
2) Stats not clamped? → reducers missing clamp
3) Whale coin repeats? → `whaleUsedThisLevel` flag not set
4) Level 6 accessible early? → `sleepCompleted` gate not enforced
