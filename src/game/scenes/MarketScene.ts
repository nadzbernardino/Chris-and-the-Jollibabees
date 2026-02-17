import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PALETTE, PALETTE_CSS, SCENES } from '../config';
import { store } from '../store/GameStore';
import { applyMarketPurchase, MARKET_ITEMS, MarketItem } from '../store/reducers/applyMarketPurchase';
import { AudioManager } from '../audio/AudioManager';

import { LEVEL_TO_ROOM } from './WorldMapScene';

export class MarketScene extends Phaser.Scene {
  private statsText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private buttons: { bg: Phaser.GameObjects.Rectangle; item: MarketItem }[] = [];
  private audio!: AudioManager;
  private afterLevelId: number | null = null;

  constructor() {
    super(SCENES.MARKET);
  }

  init(data?: { afterLevelId?: number }): void {
    this.afterLevelId = data?.afterLevelId ?? null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.wood1);
    this.cameras.main.fadeIn(400, 0x5c, 0x3a, 0x21);
    this.audio = new AudioManager(this);
    this.buttons = [];

    // Title panel
    this.add.rectangle(GAME_WIDTH / 2, 40, 320, 48, PALETTE.forest1, 0.9)
      .setStrokeStyle(2, PALETTE.highlight1);
    this.add.text(GAME_WIDTH / 2, 40, 'Forest Market', {
      fontSize: '28px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    // Diamonds display
    this.statsText = this.add.text(GAME_WIDTH / 2, 80, '', {
      fontSize: '16px', fontFamily: 'monospace', color: PALETTE_CSS.highlight1,
    }).setOrigin(0.5);

    // Item cards
    const startY = 130;
    for (let i = 0; i < MARKET_ITEMS.length; i++) {
      const item = MARKET_ITEMS[i];
      const y = startY + i * 105;

      const bg = this.add.rectangle(GAME_WIDTH / 2, y, 520, 82, PALETTE.forest1)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, PALETTE.highlight1);

      // Inner carved border
      this.add.rectangle(GAME_WIDTH / 2, y, 508, 70, 0x000000, 0)
        .setStrokeStyle(1, PALETTE.forest3);

      this.add.text(GAME_WIDTH / 2, y - 14, `${item.label} — ${item.cost} ◆`, {
        fontSize: '19px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
      }).setOrigin(0.5);

      this.add.text(GAME_WIDTH / 2, y + 14, item.description, {
        fontSize: '13px', fontFamily: 'monospace', color: PALETTE_CSS.champagne,
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        this.audio.buttonTap();
        this.purchase(item.id);
      });
      this.buttons.push({ bg, item: item.id });
    }

    // Message
    this.messageText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100, '', {
      fontSize: '16px', fontFamily: 'monospace', color: PALETTE_CSS.danger,
    }).setOrigin(0.5);

    // Continue button
    const continueBtn = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT - 50, 240, 54, PALETTE.wood2,
    ).setInteractive({ useHandCursor: true }).setStrokeStyle(2, PALETTE.highlight1);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 50, 228, 42, 0x000000, 0)
      .setStrokeStyle(1, PALETTE.champagne);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Continue', {
      fontSize: '20px', fontFamily: 'monospace', color: PALETTE_CSS.ivory,
    }).setOrigin(0.5);

    continueBtn.on('pointerdown', () => {
      this.audio.buttonTap();
      this.cameras.main.fadeOut(400, 0x1f, 0x3b, 0x2c);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        const roomKey = this.afterLevelId != null ? LEVEL_TO_ROOM[this.afterLevelId] : null;
        this.scene.start(SCENES.WORLD_MAP, {
          panFromRoom: roomKey ?? null,
        });
      });
    });

    this.refreshUI();
  }

  private purchase(item: MarketItem): void {
    const result = applyMarketPurchase(store.stats, item);
    if (!result) {
      this.messageText.setText('Not enough Diamonds!');
      this.time.delayedCall(1500, () => this.messageText.setText(''));
      return;
    }
    store.setStats(result);
    this.audio.marketPurchase();
    this.messageText.setText(`Purchased ${item}!`);
    this.messageText.setColor(PALETTE_CSS.highlight1);
    this.time.delayedCall(1500, () => {
      this.messageText.setText('');
      this.messageText.setColor(PALETTE_CSS.danger);
    });
    this.refreshUI();
  }

  private refreshUI(): void {
    const s = store.stats;
    this.statsText.setText(
      `◆ ${s.diamonds}    Prep: ${s.preparation}    Energy: ${s.energy}    Integrity: ${s.integrity}`
    );
    for (const btn of this.buttons) {
      const def = MARKET_ITEMS.find(m => m.id === btn.item)!;
      const canAfford = s.diamonds >= def.cost;
      const alreadyBought = btn.item === 'ring' && s.hasRing;
      if (!canAfford || alreadyBought) {
        btn.bg.setFillStyle(PALETTE.mist);
        btn.bg.setAlpha(0.6);
      } else {
        btn.bg.setFillStyle(PALETTE.forest1);
        btn.bg.setAlpha(1);
      }
    }
  }
}
