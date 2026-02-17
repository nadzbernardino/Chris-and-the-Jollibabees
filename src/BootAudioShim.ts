// BootAudioShim: Ensures BEEHIVE music starts as soon as possible, even before Phaser scenes.
import { AUDIO_KEYS } from './game/audio/AudioManager';

function playBeehiveMusicEarly() {
  // Try to play music using the global Phaser sound manager if available
  // Otherwise, defer until BootScene
  const tryPlay = () => {
    // @ts-ignore
    const phaserSound = window.Phaser && window.Phaser.Sound && window.Phaser.Sound.BaseSoundManager ? window.Phaser.Sound.BaseSoundManager : null;
    const win = window as any;
    if (phaserSound && win.game && win.game.sound) {
      try {
        win.game.sound.play(AUDIO_KEYS.introMusic, { loop: true, volume: 0.35 });
      } catch {}
    }
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(tryPlay, 100);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(tryPlay, 100));
  }
}

playBeehiveMusicEarly();
