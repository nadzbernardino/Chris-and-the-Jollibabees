import Phaser from 'phaser';

import { DESIGN_W, DESIGN_H } from './game/constants';

// ── Scenes ────────────────────────────────────────────────
import { BootScene } from './game/scenes/BootScene';
import { IntroSceneNew } from './game/scenes/IntroSceneNew';
import { WorldScene } from './game/scenes/WorldScene';
import { VacuumMinigame } from './game/scenes/VacuumMinigame';
import { FoldingMinigame } from './game/scenes/FoldingMinigame';
import { DishMinigame } from './game/scenes/DishMinigame';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: DESIGN_W,
  height: DESIGN_H,
  parent: 'game',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_W,
    height: DESIGN_H,
  },
  scene: [
    BootScene,
    IntroSceneNew,
    WorldScene,
    VacuumMinigame,
    FoldingMinigame,
    DishMinigame,
  ],
  input: {
    activePointers: 2,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  backgroundColor: '#1F3B2C',
  render: {
    pixelArt: true,
    antialias: false,
  },
};

new Phaser.Game(config);
