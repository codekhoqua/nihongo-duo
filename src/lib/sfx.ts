/** Tiny synthesized sound effects (no asset files, no network). */

export type SfxName = 'correct' | 'wrong' | 'complete' | 'tap' | 'levelup';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, startMs: number, durationMs: number, gain = 0.08, type: OscillatorType = 'sine') {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  const start = ac.currentTime + startMs / 1000;
  const end = start + durationMs / 1000;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  vol.gain.setValueAtTime(0.0001, start);
  vol.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  vol.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(vol).connect(ac.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

const PRESETS: Record<SfxName, Array<[number, number, number, number?, OscillatorType?]>> = {
  tap: [[520, 0, 60, 0.05, 'triangle']],
  correct: [
    [784, 0, 110, 0.07],
    [1046, 90, 160, 0.07],
  ],
  wrong: [
    [220, 0, 150, 0.07, 'sawtooth'],
    [160, 130, 200, 0.06, 'sawtooth'],
  ],
  complete: [
    [523, 0, 110],
    [659, 100, 110],
    [784, 200, 160],
    [1046, 330, 260],
  ],
  levelup: [
    [659, 0, 90],
    [880, 90, 90],
    [1174, 180, 220],
  ],
};

export function playSfx(name: SfxName, enabled = true): void {
  if (!enabled) return;
  for (const [freq, start, dur, gain, type] of PRESETS[name]) {
    tone(freq, start, dur, gain, type);
  }
}
