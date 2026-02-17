/**
 * ProceduralAudio — Generates all game sounds programmatically.
 *
 * Uses OfflineAudioContext to render WAV buffers that Phaser can play
 * via base64 data URLs. Zero external audio files needed.
 *
 * Style: cute 8-bit / chiptuney with cottage-fantasy warmth.
 */

import { AUDIO_KEYS } from './AudioManager';

// ─── WAV Encoder ───────────────────────────────────────────

function encodeWAV(samples: Float32Array, sampleRate: number): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);       // PCM
  view.setUint16(22, 1, true);       // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  // Convert to base64 data URL
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

// ─── Synth Helpers ─────────────────────────────────────────

const SR = 22050; // sample rate — lower = smaller files, fine for 8-bit style

/** Generate a sine tone with envelope */
function tone(freq: number, dur: number, vol = 0.5, decay = true): Float32Array {
  const len = Math.floor(SR * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = decay ? Math.max(0, 1 - t / dur) : 1;
    out[i] = Math.sin(2 * Math.PI * freq * t) * vol * env;
  }
  return out;
}

/** Square wave (8-bit classic) */
function square(freq: number, dur: number, vol = 0.3, decay = true): Float32Array {
  const len = Math.floor(SR * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = decay ? Math.max(0, 1 - t / dur) : 1;
    const phase = (freq * t) % 1;
    out[i] = (phase < 0.5 ? 1 : -1) * vol * env;
  }
  return out;
}

/** Triangle wave (softer 8-bit) */
function triangle(freq: number, dur: number, vol = 0.4, decay = true): Float32Array {
  const len = Math.floor(SR * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = decay ? Math.max(0, 1 - t / dur) : 1;
    const phase = (freq * t) % 1;
    out[i] = (4 * Math.abs(phase - 0.5) - 1) * vol * env;
  }
  return out;
}

/** White noise */
function noise(dur: number, vol = 0.3, decay = true): Float32Array {
  const len = Math.floor(SR * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = decay ? Math.max(0, 1 - t / dur) : 1;
    out[i] = (Math.random() * 2 - 1) * vol * env;
  }
  return out;
}

/** Mix multiple buffers together (additive) */
function mix(...buffers: Float32Array[]): Float32Array {
  const maxLen = Math.max(...buffers.map(b => b.length));
  const out = new Float32Array(maxLen);
  for (const buf of buffers) {
    for (let i = 0; i < buf.length; i++) out[i] += buf[i];
  }
  // Soft clip
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.tanh(out[i]);
  }
  return out;
}

/** Sequencing: place a buffer at an offset (seconds) into a target length */
function place(buf: Float32Array, offsetSec: number, totalDur: number): Float32Array {
  const totalLen = Math.floor(SR * totalDur);
  const out = new Float32Array(totalLen);
  const off = Math.floor(SR * offsetSec);
  for (let i = 0; i < buf.length && off + i < totalLen; i++) {
    out[off + i] = buf[i];
  }
  return out;
}

/** Frequency slide (portamento) */
function slide(freqStart: number, freqEnd: number, dur: number, vol = 0.3, wave: 'square' | 'sine' | 'tri' = 'square'): Float32Array {
  const len = Math.floor(SR * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const frac = t / dur;
    const freq = freqStart + (freqEnd - freqStart) * frac;
    const env = Math.max(0, 1 - frac);
    const phase = (freq * t) % 1;
    let val: number;
    if (wave === 'square') val = phase < 0.5 ? 1 : -1;
    else if (wave === 'tri') val = 4 * Math.abs(phase - 0.5) - 1;
    else val = Math.sin(2 * Math.PI * phase);
    out[i] = val * vol * env;
  }
  return out;
}

// ─── Sound Generators ──────────────────────────────────────

function genBtnClick(): string {
  // Soft click: short high freq blip
  const s = mix(
    square(800, 0.04, 0.25),
    square(1200, 0.02, 0.15),
  );
  return encodeWAV(s, SR);
}

function genTaskStart(): string {
  // Ascending 3-note arpeggio
  const dur = 0.55;
  const s = mix(
    place(triangle(523, 0.12, 0.35), 0, dur),       // C5
    place(triangle(659, 0.12, 0.35), 0.13, dur),     // E5
    place(triangle(784, 0.18, 0.35), 0.26, dur),     // G5
  );
  return encodeWAV(s, SR);
}

function genTaskComplete(): string {
  // Triumphant ascending chord
  const dur = 0.8;
  const s = mix(
    place(square(523, 0.15, 0.2), 0, dur),        // C5
    place(square(659, 0.15, 0.2), 0.1, dur),      // E5
    place(square(784, 0.15, 0.2), 0.2, dur),      // G5
    place(square(1047, 0.3, 0.25), 0.35, dur),    // C6 (held)
    place(tone(523, 0.3, 0.1), 0.35, dur),        // Sine root
  );
  return encodeWAV(s, SR);
}

function genHeartGain(): string {
  // Happy sparkle: rising freq sweep + little chime
  const dur = 0.45;
  const s = mix(
    slide(400, 1200, 0.2, 0.2, 'sine'),
    place(triangle(880, 0.15, 0.3), 0.15, dur),
    place(triangle(1100, 0.15, 0.25), 0.25, dur),
  );
  return encodeWAV(s, SR);
}

function genHeartLose(): string {
  // Sad descending thud
  const dur = 0.5;
  const s = mix(
    slide(400, 120, 0.3, 0.35, 'square'),
    place(noise(0.08, 0.2), 0, dur),
  );
  return encodeWAV(s, SR);
}

function genPopupOpen(): string {
  // Whoosh + soft chime
  const dur = 0.35;
  const s = mix(
    slide(200, 800, 0.15, 0.2, 'sine'),
    place(triangle(660, 0.12, 0.2), 0.1, dur),
    place(noise(0.06, 0.08), 0, dur),
  );
  return encodeWAV(s, SR);
}

function genPopupClose(): string {
  // Reverse whoosh
  const s = slide(800, 200, 0.15, 0.2, 'sine');
  return encodeWAV(s, SR);
}

function genWaterSplash(): string {
  // Bubbly splash
  const dur = 0.5;
  const s = mix(
    noise(0.15, 0.3),
    place(tone(600, 0.08, 0.15), 0.05, dur),
    place(tone(500, 0.08, 0.12), 0.12, dur),
    place(tone(700, 0.06, 0.1), 0.18, dur),
    place(noise(0.2, 0.15), 0.1, dur),
  );
  return encodeWAV(s, SR);
}

function genDoorOpen(): string {
  // Creaky door: low freq sweep + noise
  const dur = 0.6;
  const s = mix(
    slide(150, 300, 0.4, 0.2, 'square'),
    place(noise(0.3, 0.1), 0.1, dur),
    place(tone(200, 0.2, 0.15), 0.3, dur),
  );
  return encodeWAV(s, SR);
}

function genEndingChime(): string {
  // Grand fanfare: rich chord progression
  const dur = 2.0;
  const s = mix(
    // Opening chord (C major)
    place(triangle(262, 0.4, 0.2), 0, dur),     // C4
    place(triangle(330, 0.4, 0.2), 0, dur),     // E4
    place(triangle(392, 0.4, 0.2), 0, dur),     // G4
    // Second chord (F major)
    place(triangle(349, 0.4, 0.2), 0.45, dur),  // F4
    place(triangle(440, 0.4, 0.2), 0.45, dur),  // A4
    place(triangle(523, 0.4, 0.2), 0.45, dur),  // C5
    // Resolution (G → C)
    place(square(392, 0.3, 0.15), 0.95, dur),   // G4
    place(square(494, 0.3, 0.15), 0.95, dur),   // B4
    place(square(587, 0.3, 0.15), 0.95, dur),   // D5
    // Final C major (held)
    place(triangle(523, 0.7, 0.25), 1.3, dur),  // C5
    place(triangle(659, 0.7, 0.2), 1.3, dur),   // E5
    place(triangle(784, 0.7, 0.2), 1.3, dur),   // G5
    place(tone(523, 0.7, 0.1), 1.3, dur),       // Sine root
  );
  return encodeWAV(s, SR);
}

function genPigAlert(): string {
  // Danger! Phone ring — rapid alternating tones
  const dur = 0.6;
  const s = mix(
    place(square(880, 0.08, 0.3), 0, dur),
    place(square(660, 0.08, 0.3), 0.1, dur),
    place(square(880, 0.08, 0.3), 0.2, dur),
    place(square(660, 0.08, 0.3), 0.3, dur),
    place(square(880, 0.08, 0.3), 0.4, dur),
    place(square(660, 0.08, 0.25), 0.5, dur),
  );
  return encodeWAV(s, SR);
}

function genWhaleCoin(): string {
  // Mysterious coin sound: rising arpeggio with shimmer
  const dur = 0.7;
  const s = mix(
    place(triangle(330, 0.1, 0.25), 0, dur),     // E4
    place(triangle(440, 0.1, 0.25), 0.08, dur),   // A4
    place(triangle(554, 0.1, 0.25), 0.16, dur),   // C#5
    place(triangle(660, 0.15, 0.3), 0.24, dur),   // E5
    place(tone(880, 0.3, 0.15), 0.35, dur),       // shimmer
    place(tone(1100, 0.2, 0.1), 0.4, dur),
  );
  return encodeWAV(s, SR);
}

function genJollibabeeFound(): string {
  // Celebratory discovery jingle
  const dur = 1.0;
  const s = mix(
    place(square(523, 0.1, 0.2), 0, dur),       // C5
    place(square(587, 0.1, 0.2), 0.1, dur),     // D5
    place(square(659, 0.1, 0.2), 0.2, dur),     // E5
    place(square(784, 0.15, 0.2), 0.3, dur),    // G5
    place(triangle(1047, 0.4, 0.25), 0.5, dur), // C6 sparkle
    place(tone(1319, 0.3, 0.1), 0.55, dur),     // E6 shimmer
    place(tone(784, 0.4, 0.1), 0.5, dur),       // G5 base
  );
  return encodeWAV(s, SR);
}

function genPop(): string {
  // Quick pop
  const s = mix(
    slide(600, 200, 0.06, 0.3, 'sine'),
    noise(0.03, 0.15),
  );
  return encodeWAV(s, SR);
}

function genPoof(): string {
  // Soft poof (like something disappearing)
  const dur = 0.25;
  const s = mix(
    slide(400, 100, 0.15, 0.2, 'sine'),
    noise(0.15, 0.2),
    place(tone(300, 0.1, 0.1), 0.05, dur),
  );
  return encodeWAV(s, SR);
}

function genThunk(): string {
  // Heavy drop
  const s = mix(
    slide(300, 80, 0.1, 0.4, 'square'),
    noise(0.05, 0.3),
  );
  return encodeWAV(s, SR);
}

function genVacuumTick(): string {
  // Short mechanical tick
  const s = mix(
    square(150, 0.04, 0.2),
    noise(0.03, 0.15),
  );
  return encodeWAV(s, SR);
}

function genVacuumSuction(): string {
  // Loopable suction hum (low rumble)
  const dur = 1.0;
  const len = Math.floor(SR * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    // Low rumble + slight modulation
    const lfo = 0.8 + 0.2 * Math.sin(2 * Math.PI * 3 * t);
    out[i] = (
      0.15 * (Math.sin(2 * Math.PI * 80 * t)) +
      0.1 * (Math.sin(2 * Math.PI * 120 * t)) +
      0.05 * (Math.random() * 2 - 1)
    ) * lfo;
  }
  return encodeWAV(out, SR);
}

function genWhoosh(): string {
  // Fast whoosh
  const dur = 0.3;
  const s = mix(
    slide(200, 1000, 0.2, 0.15, 'sine'),
    noise(0.2, 0.15),
  );
  return encodeWAV(s, SR);
}

function genBloop(): string {
  // Water bloop
  const s = mix(
    slide(800, 300, 0.12, 0.25, 'sine'),
    tone(500, 0.08, 0.15),
  );
  return encodeWAV(s, SR);
}

// ─── Background Music ──────────────────────────────────────

function genAmbientCottage(): string {
  // Cute looping cottage BGM — gentle pentatonic melody over soft pads
  // ~8 seconds loop, warm and cozy
  const dur = 8.0;
  const totalLen = Math.floor(SR * dur);

  // Pentatonic scale: C D E G A (cottage/forest feel)
  const melody = [
    // bar 1
    { note: 523, start: 0.0, len: 0.3 },    // C5
    { note: 587, start: 0.35, len: 0.3 },   // D5
    { note: 659, start: 0.7, len: 0.5 },    // E5
    { note: 784, start: 1.3, len: 0.3 },    // G5
    // bar 2
    { note: 880, start: 1.7, len: 0.5 },    // A5
    { note: 784, start: 2.3, len: 0.3 },    // G5
    { note: 659, start: 2.7, len: 0.5 },    // E5
    // bar 3
    { note: 587, start: 3.3, len: 0.3 },    // D5
    { note: 523, start: 3.7, len: 0.5 },    // C5
    { note: 587, start: 4.3, len: 0.3 },    // D5
    { note: 659, start: 4.7, len: 0.4 },    // E5
    // bar 4
    { note: 784, start: 5.2, len: 0.3 },    // G5
    { note: 880, start: 5.6, len: 0.4 },    // A5
    { note: 784, start: 6.1, len: 0.3 },    // G5
    { note: 659, start: 6.5, len: 0.4 },    // E5
    // bar 5 (resolve)
    { note: 523, start: 7.0, len: 0.6 },    // C5
    { note: 392, start: 7.3, len: 0.5 },    // G4 (harmony)
  ];

  // Bass notes (root motion)
  const bass = [
    { note: 131, start: 0, len: 1.6 },      // C3
    { note: 165, start: 1.7, len: 1.5 },    // E3
    { note: 147, start: 3.3, len: 1.5 },    // D3
    { note: 131, start: 5.0, len: 1.5 },    // C3
    { note: 110, start: 6.6, len: 1.4 },    // A2
  ];

  // Arpeggiated chords (gentle shimmer)
  const arp = [
    // C chord arpeggio
    { note: 262, start: 0.0, len: 0.15 },
    { note: 330, start: 0.2, len: 0.15 },
    { note: 392, start: 0.4, len: 0.15 },
    { note: 262, start: 0.6, len: 0.15 },
    // Am arpeggio
    { note: 220, start: 1.7, len: 0.15 },
    { note: 262, start: 1.9, len: 0.15 },
    { note: 330, start: 2.1, len: 0.15 },
    { note: 220, start: 2.3, len: 0.15 },
    // G chord
    { note: 196, start: 3.3, len: 0.15 },
    { note: 247, start: 3.5, len: 0.15 },
    { note: 294, start: 3.7, len: 0.15 },
    { note: 196, start: 3.9, len: 0.15 },
    // C chord
    { note: 262, start: 5.0, len: 0.15 },
    { note: 330, start: 5.2, len: 0.15 },
    { note: 392, start: 5.4, len: 0.15 },
    { note: 330, start: 5.6, len: 0.15 },
    // F chord (resolution)
    { note: 175, start: 6.6, len: 0.15 },
    { note: 220, start: 6.8, len: 0.15 },
    { note: 262, start: 7.0, len: 0.15 },
    { note: 220, start: 7.2, len: 0.15 },
  ];

  // Build melody layer (triangle wave — sweet and clear)
  const melodyBufs = melody.map(n =>
    place(triangle(n.note, n.len, 0.18, true), n.start, dur),
  );

  // Build bass layer (sine — warm and round)
  const bassBufs = bass.map(n =>
    place(tone(n.note, n.len, 0.12, true), n.start, dur),
  );

  // Build arpeggio layer (square wave — light chiptune sparkle)
  const arpBufs = arp.map(n =>
    place(square(n.note, n.len, 0.06, true), n.start, dur),
  );

  // Combine all layers
  const combined = mix(...melodyBufs, ...bassBufs, ...arpBufs);

  // Apply gentle fade at loop boundaries for seamless loop
  const fadeLen = Math.floor(SR * 0.3);
  for (let i = 0; i < fadeLen; i++) {
    const frac = i / fadeLen;
    combined[i] *= frac;                                    // fade in
    combined[combined.length - 1 - i] *= frac;              // fade out
  }

  return encodeWAV(combined, SR);
}

function genIntroMusic(): string {
  // Dreamy, magical title screen music — slower tempo, ethereal feel
  // ~10 second loop with gentle arpeggios and a floating melody
  const dur = 10.0;

  // Slow dreamy melody (Am pentatonic — A C D E G)
  const melody = [
    { note: 440, start: 0.0, len: 0.6 },    // A4
    { note: 523, start: 0.7, len: 0.5 },    // C5
    { note: 659, start: 1.3, len: 0.7 },    // E5
    { note: 587, start: 2.2, len: 0.5 },    // D5
    { note: 523, start: 2.9, len: 0.7 },    // C5
    { note: 440, start: 3.8, len: 0.8 },    // A4
    // Second phrase — higher
    { note: 659, start: 5.0, len: 0.5 },    // E5
    { note: 784, start: 5.6, len: 0.6 },    // G5
    { note: 880, start: 6.4, len: 0.8 },    // A5
    { note: 784, start: 7.4, len: 0.5 },    // G5
    { note: 659, start: 8.1, len: 0.6 },    // E5
    { note: 523, start: 8.9, len: 0.7 },    // C5
  ];

  // Deep warm bass (slow root motion)
  const bass = [
    { note: 110, start: 0, len: 2.5 },      // A2
    { note: 131, start: 2.5, len: 2.3 },    // C3
    { note: 110, start: 5.0, len: 2.5 },    // A2
    { note: 98, start: 7.5, len: 2.5 },     // G2
  ];

  // Shimmering arpeggios (sine wave — ethereal)
  const arp = [
    { note: 220, start: 0.0, len: 0.2 },
    { note: 262, start: 0.3, len: 0.2 },
    { note: 330, start: 0.6, len: 0.2 },
    { note: 440, start: 0.9, len: 0.2 },

    { note: 262, start: 1.8, len: 0.2 },
    { note: 330, start: 2.1, len: 0.2 },
    { note: 392, start: 2.4, len: 0.2 },
    { note: 523, start: 2.7, len: 0.2 },

    { note: 220, start: 3.6, len: 0.2 },
    { note: 330, start: 3.9, len: 0.2 },
    { note: 440, start: 4.2, len: 0.2 },
    { note: 523, start: 4.5, len: 0.2 },

    { note: 220, start: 5.4, len: 0.2 },
    { note: 262, start: 5.7, len: 0.2 },
    { note: 330, start: 6.0, len: 0.2 },
    { note: 440, start: 6.3, len: 0.2 },

    { note: 196, start: 7.2, len: 0.2 },
    { note: 247, start: 7.5, len: 0.2 },
    { note: 330, start: 7.8, len: 0.2 },
    { note: 392, start: 8.1, len: 0.2 },

    { note: 220, start: 8.8, len: 0.2 },
    { note: 330, start: 9.1, len: 0.2 },
    { note: 440, start: 9.4, len: 0.2 },
  ];

  // Melody: triangle for warmth
  const melodyBufs = melody.map(n =>
    place(triangle(n.note, n.len, 0.16, true), n.start, dur),
  );

  // Bass: sine — deep and warm
  const bassBufs = bass.map(n =>
    place(tone(n.note, n.len, 0.1, true), n.start, dur),
  );

  // Arpeggios: sine — shimmery and ethereal
  const arpBufs = arp.map(n =>
    place(tone(n.note, n.len, 0.07, true), n.start, dur),
  );

  const combined = mix(...melodyBufs, ...bassBufs, ...arpBufs);

  // Smooth loop boundary fades
  const fadeLen = Math.floor(SR * 0.5);
  for (let i = 0; i < fadeLen; i++) {
    const frac = i / fadeLen;
    combined[i] *= frac;
    combined[combined.length - 1 - i] *= frac;
  }

  return encodeWAV(combined, SR);
}

// ─── Public API ────────────────────────────────────────────

/** Map of audio key → data URL. Call once at boot. */
export function generateAllAudio(): Record<string, string> {
  return {
    [AUDIO_KEYS.ambient]:          genAmbientCottage(),
    [AUDIO_KEYS.introMusic]:       genIntroMusic(),
    [AUDIO_KEYS.btnClick]:         genBtnClick(),
    [AUDIO_KEYS.taskStart]:        genTaskStart(),
    [AUDIO_KEYS.taskComplete]:     genTaskComplete(),
    [AUDIO_KEYS.heartGain]:        genHeartGain(),
    [AUDIO_KEYS.heartLose]:        genHeartLose(),
    [AUDIO_KEYS.popupOpen]:        genPopupOpen(),
    [AUDIO_KEYS.popupClose]:       genPopupClose(),
    [AUDIO_KEYS.vacuumSuction]:    genVacuumSuction(),
    [AUDIO_KEYS.waterSplash]:      genWaterSplash(),
    [AUDIO_KEYS.doorOpen]:         genDoorOpen(),
    [AUDIO_KEYS.endingChime]:      genEndingChime(),
    [AUDIO_KEYS.pigAlert]:         genPigAlert(),
    [AUDIO_KEYS.whaleCoin]:        genWhaleCoin(),
    [AUDIO_KEYS.jollibabeeFound]:  genJollibabeeFound(),
    [AUDIO_KEYS.pop]:              genPop(),
    [AUDIO_KEYS.poof]:             genPoof(),
    [AUDIO_KEYS.thunk]:            genThunk(),
    [AUDIO_KEYS.vacuumTick]:       genVacuumTick(),
    [AUDIO_KEYS.whoosh]:           genWhoosh(),
    [AUDIO_KEYS.bloop]:            genBloop(),
  };
}
