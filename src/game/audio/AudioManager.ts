import Phaser from 'phaser';

/**
 * AudioManager — Cottage-fantasy audio system.
 *
 * Handles SFX + ambient music with mobile-safe unlock.
 * All hooks call through playSfx / playMusic; if an asset is missing
 * we just log a warning and move on — no crash.
 *
 * Audio file mapping: drop .ogg / .mp3 files into src/assets/audio/
 * and add matching keys to AUDIO_KEYS below. BootScene should call
 * `this.load.audio(key, path)` for each key.
 *
 * Suggested file set:
 *   ambient_cottage.ogg   — soft looping forest/cottage BGM
 *   btn_click.ogg         — button click / tap
 *   task_start.ogg        — task begin chime
 *   task_complete.ogg     — "That task is done" jingle
 *   heart_gain.ogg        — +1 heart sparkle
 *   heart_lose.ogg        — -1 heart thud
 *   popup_open.ogg        — modal open whoosh
 *   popup_close.ogg       — modal close
 *   vacuum_suction.ogg    — vacuum minigame loop
 *   water_splash.ogg      — bonsai watering
 *   door_open.ogg         — exit door open
 *   ending_chime.ogg      — ending fanfare
 *   pig_alert.ogg         — temptation pig appears
 *   whale_coin.ogg        — whale coin popup
 *   jollibabee_found.ogg  — new jollibabee discovered
 */

/** All known audio keys — add new keys here when adding audio files */
export const AUDIO_KEYS = {
  ambient:          'ambient_cottage',
  introMusic:       'intro_music',
  btnClick:         'btn_click',
  taskStart:        'task_start',
  taskComplete:     'task_complete',
  heartGain:        'heart_gain',
  heartLose:        'heart_lose',
  popupOpen:        'popup_open',
  popupClose:       'popup_close',
  vacuumSuction:    'vacuum_suction',
  waterSplash:      'water_splash',
  doorOpen:         'door_open',
  endingChime:      'ending_chime',
  pigAlert:         'pig_alert',
  whaleCoin:        'whale_coin',
  jollibabeeFound:  'jollibabee_found',
  pop:              'pop',
  poof:             'poof',
  thunk:            'thunk',
  vacuumTick:       'vacuum_tick',
  whoosh:           'whoosh',
  bloop:            'bloop',
} as const;

/** Base path for audio files — files go here */
export const AUDIO_PATH = 'src/assets/audio/';

export class AudioManager {
  private scene: Phaser.Scene;
  private unlocked = false;
  private ambientPlaying = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Auto-detect if audio was already unlocked by a prior scene
    // (IntroScene unlocks on first tap — the WebAudio context is shared)
    if (scene.sound && 'context' in scene.sound) {
      const ctx = (scene.sound as unknown as { context: AudioContext }).context;
      if (ctx?.state === 'running') {
        this.unlocked = true;
      }
    }
  }

  /**
   * Must be called on first user interaction (mobile audio policy).
   * Typically triggered by the IntroScene "Start" button.
   */
  unlockAudio(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.scene.sound && 'context' in this.scene.sound) {
      const ctx = (this.scene.sound as unknown as { context: AudioContext }).context;
      if (ctx?.state === 'suspended') {
        ctx.resume();
      }
    }
  }

  // ─── Core Playback ─────────────────────────────────────

  /** Play a named SFX. Logs warning if asset is missing. */
  playSfx(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.unlocked) return;
    try {
      if (this.scene.cache.audio.exists(key)) {
        this.scene.sound.play(key, config);
      } else if (import.meta.env.DEV) {
        console.warn(`[Audio] SFX not loaded: "${key}" — skipping`);
      }
    } catch (e) {
      console.warn(`[Audio] Error playing "${key}":`, e);
    }
  }

  /** Start ambient music loop (only once) */
  startAmbient(): void {
    if (this.ambientPlaying) return;
    this.ambientPlaying = true;
    this.playSfx(AUDIO_KEYS.ambient, { loop: true, volume: 0.3 });
  }

  /** Stop ambient music */
  stopAmbient(): void {
    this.ambientPlaying = false;
    try { this.scene.sound.stopByKey(AUDIO_KEYS.ambient); } catch { /* noop */ }
  }

  /** Start intro/title screen music loop */
  startIntroMusic(): void {
    this.playSfx(AUDIO_KEYS.introMusic, { loop: true, volume: 0.35 });
  }

  /** Stop intro music */
  stopIntroMusic(): void {
    try { this.scene.sound.stopByKey(AUDIO_KEYS.introMusic); } catch { /* noop */ }
  }

  // ─── Convenience Hooks ─────────────────────────────────

  btnClick():         void { this.playSfx(AUDIO_KEYS.btnClick); }
  taskStart():        void { this.playSfx(AUDIO_KEYS.taskStart); }
  taskComplete():     void { this.playSfx(AUDIO_KEYS.taskComplete); }
  heartGain():        void { this.playSfx(AUDIO_KEYS.heartGain); }
  heartLose():        void { this.playSfx(AUDIO_KEYS.heartLose); }
  popupOpen():        void { this.playSfx(AUDIO_KEYS.popupOpen); }
  popupClose():       void { this.playSfx(AUDIO_KEYS.popupClose); }
  vacuumSuction():    void { this.playSfx(AUDIO_KEYS.vacuumSuction, { loop: true, volume: 0.4 }); }
  stopVacuum():       void { try { this.scene.sound.stopByKey(AUDIO_KEYS.vacuumSuction); } catch { /* noop */ } }
  waterSplash():      void { this.playSfx(AUDIO_KEYS.waterSplash); }
  doorOpen():         void { this.playSfx(AUDIO_KEYS.doorOpen); }
  endingChime():      void { this.playSfx(AUDIO_KEYS.endingChime); }
  pigAlert():         void { this.playSfx(AUDIO_KEYS.pigAlert); }
  whaleCoin():        void { this.playSfx(AUDIO_KEYS.whaleCoin); }
  jollibabeeFound():  void { this.playSfx(AUDIO_KEYS.jollibabeeFound); }
  pop():              void { this.playSfx(AUDIO_KEYS.pop); }
  poof():             void { this.playSfx(AUDIO_KEYS.poof); }
  thunk():            void { this.playSfx(AUDIO_KEYS.thunk); }
  vacuumTick():       void { this.playSfx(AUDIO_KEYS.vacuumTick); }
  whoosh():           void { this.playSfx(AUDIO_KEYS.whoosh); }
  bloop():            void { this.playSfx(AUDIO_KEYS.bloop); }

  // Legacy compat aliases
  levelStart():       void { this.taskStart(); }
  levelComplete():    void { this.taskComplete(); }
  buttonTap():        void { this.btnClick(); }
  whaleCoinWin():     void { this.playSfx(AUDIO_KEYS.whaleCoin); }
  whaleCoinLose():    void { this.playSfx(AUDIO_KEYS.whaleCoin); }
  pigAvoided():       void { this.playSfx(AUDIO_KEYS.popupClose); }
  doomScrollOpen():   void { this.popupOpen(); }
  darmeshRing():      void { this.popupOpen(); }
  marketPurchase():   void { this.taskComplete(); }
  sleepComplete():    void { this.taskComplete(); }
  gameOver():         void { this.heartLose(); }
  pickupSuccess():    void { this.endingChime(); }
}
