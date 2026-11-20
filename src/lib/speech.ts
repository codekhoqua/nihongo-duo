/**
 * Japanese text-to-speech via the Web Speech API.
 * Falls back silently when the browser has no Japanese voice.
 *
 * Chrome quirks handled here:
 * - The engine is cold on the first use of a page and clips the first mora,
 *   so we speak one silent utterance ("primer") on the first user gesture.
 * - `cancel()` followed by `speak()` in the same task races the teardown and
 *   truncates the start of the new utterance, so they are always split.
 * - `getVoices()` is empty until `voiceschanged`, so the first utterance waits
 *   for voices (max 500ms) instead of speaking with the default voice.
 */

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

export const speechSupported = getSynth() !== null;

function currentVoices(): SpeechSynthesisVoice[] {
  const synth = getSynth();
  if (!synth) return [];
  try {
    return synth.getVoices();
  } catch {
    return [];
  }
}

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = currentVoices();
  // Don't cache "no voices yet"; voiceschanged will re-run this later.
  if (voices.length === 0) return null;
  cachedVoice =
    voices.find((v) => v.lang === 'ja-JP') ??
    voices.find((v) => v.lang?.toLowerCase().startsWith('ja')) ??
    null;
  return cachedVoice;
}

if (speechSupported) {
  // Voices can load asynchronously.
  getSynth()?.addEventListener?.('voiceschanged', () => {
    cachedVoice = undefined;
    pickVoice();
  });
}

export interface SpeakOptions {
  /** 0.5 – 2.0, default 0.85 (slower is friendlier for learners). */
  rate?: number;
  /** Skip playback entirely (sound off). */
  enabled?: boolean;
}

/* ------------------------------------------------------------- warm-up */

let primed = false;

/** Initialize the engine with a silent, very fast utterance. Runs once. */
function prime(): void {
  if (primed) return;
  primed = true;
  const synth = getSynth();
  if (!synth) return;
  try {
    const utterance = new SpeechSynthesisUtterance('。');
    utterance.volume = 0;
    utterance.rate = 10;
    utterance.lang = 'ja-JP';
    synth.speak(utterance);
  } catch {
    /* Priming is best-effort. */
  }
}

if (speechSupported && typeof window !== 'undefined') {
  // Must happen inside a user gesture: Chrome >= M71 blocks speak() without
  // activation, and a cold engine clips the first mora otherwise.
  const onFirstGesture = () => prime();
  window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true });
  window.addEventListener('keydown', onFirstGesture, { once: true, passive: true });
}

/* ------------------------------------------------- scheduling + tokens */

let generation = 0;
let pendingTimer: number | null = null;
let voiceWaiter: (() => void) | null = null;
let spokenOnce = false;

function cancelTimer(): void {
  if (pendingTimer !== null) {
    window.clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}

function cancelPending(): void {
  cancelTimer();
  const waiter = voiceWaiter;
  voiceWaiter = null;
  if (waiter) waiter();
}

function schedule(token: number, delay: number, run: () => void): void {
  cancelTimer();
  pendingTimer = window.setTimeout(() => {
    pendingTimer = null;
    if (token !== generation) return;
    run();
  }, delay);
}

/** Wait for `voiceschanged` or 500ms, whichever comes first. */
function waitForVoices(token: number, then: () => void): void {
  const synth = getSynth();
  if (!synth) return;
  let settled = false;

  const finish = () => {
    if (settled) return;
    settled = true;
    synth.removeEventListener?.('voiceschanged', onVoicesChanged);
    cancelTimer();
    if (voiceWaiter === finish) voiceWaiter = null;
    if (token === generation) then();
  };

  const onVoicesChanged = () => {
    if (currentVoices().length > 0) finish();
  };

  voiceWaiter = finish;
  synth.addEventListener?.('voiceschanged', onVoicesChanged);
  pendingTimer = window.setTimeout(finish, 500);
}

/* ------------------------------------------------------------ playback */

function emit(text: string, rate: number, token: number): void {
  if (token !== generation) return;
  const synth = getSynth();
  if (!synth) return;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice ? voice.lang : 'ja-JP';
    utterance.rate = rate;
    utterance.pitch = 1;
    synth.speak(utterance);
    spokenOnce = true;
  } catch {
    /* TTS is a nice-to-have; never break a lesson over it. */
  }
}

function play(text: string, rate: number, token: number): void {
  if (token !== generation) return;
  // The very first real utterance waits for voices so it uses Japanese ones.
  if (!spokenOnce && currentVoices().length === 0) {
    waitForVoices(token, () => emit(text, rate, token));
    return;
  }
  emit(text, rate, token);
}

export function speak(text: string, options: SpeakOptions = {}): void {
  const { rate = 0.85, enabled = true } = options;
  if (!enabled || !text) return;
  const synth = getSynth();
  if (!synth) return;

  // Latest call wins: invalidate anything already scheduled.
  const token = ++generation;
  cancelPending();

  const needsPrimer = !primed;
  let delay = 0;

  try {
    // Never cancel + speak in the same tick; the teardown would clip the start.
    if (synth.speaking || synth.pending) {
      synth.cancel();
      delay = 200;
    }
  } catch {
    /* ignore cancel failures */
  }

  if (needsPrimer) {
    // No gesture yet: prime lazily and let the engine spin up first.
    prime();
    delay = Math.max(delay, 120);
  }

  if (delay > 0) {
    schedule(token, delay, () => play(text, rate, token));
  } else {
    play(text, rate, token);
  }
}

export function stopSpeaking(): void {
  generation += 1;
  cancelPending();
  const synth = getSynth();
  if (!synth) return;
  try {
    synth.cancel();
  } catch {
    /* ignore */
  }
}
