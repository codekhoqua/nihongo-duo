/**
 * Regression test for the clipped first Japanese utterance ("うみ" played as "み").
 *
 * `speechSupported` is computed at import time, so every case installs a fake
 * `window.speechSynthesis` first, resets the module registry and only then
 * imports `src/lib/speech`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FakeVoice = { lang: string; name: string };

interface SpeechHarness {
  synth: {
    speaking: boolean;
    pending: boolean;
    getVoices: () => FakeVoice[];
    speak: (utterance: unknown) => void;
    cancel: () => void;
    addEventListener: (type: string, handler: () => void) => void;
    removeEventListener: (type: string, handler: () => void) => void;
  };
  log: { spoken: any[]; cancels: number };
  releaseVoices: () => void;
}

class FakeUtterance {
  text: string;
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: unknown = null;

  constructor(text = '') {
    this.text = text;
  }
}

function installSpeechStub(
  options: { voices?: FakeVoice[]; voicesReady?: boolean } = {},
): SpeechHarness {
  const voices: FakeVoice[] = options.voices ?? [{ lang: 'ja-JP', name: 'Fake Japanese' }];
  let ready = options.voicesReady ?? true;
  const listeners = new Set<() => void>();
  const log = { spoken: [] as any[], cancels: 0 };

  const synth: SpeechHarness['synth'] = {
    speaking: false,
    pending: false,
    getVoices: () => (ready ? voices : []),
    speak(utterance) {
      log.spoken.push(utterance);
      synth.speaking = true;
      synth.pending = false;
    },
    cancel() {
      log.cancels += 1;
      // Chrome still reports `speaking` while the teardown is in flight, which
      // is exactly why cancel() and speak() must be split by a macrotask.
      synth.pending = false;
    },
    addEventListener(type, handler) {
      if (type === 'voiceschanged') listeners.add(handler);
    },
    removeEventListener(type, handler) {
      if (type === 'voiceschanged') listeners.delete(handler);
    },
  };

  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    writable: true,
    value: synth,
  });
  (window as any).SpeechSynthesisUtterance = FakeUtterance;
  (globalThis as any).SpeechSynthesisUtterance = FakeUtterance;

  return {
    synth,
    log,
    releaseVoices: () => {
      ready = true;
      for (const listener of [...listeners]) listener();
    },
  };
}

async function importSpeech() {
  vi.resetModules();
  return import('../src/lib/speech');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  delete (window as any).speechSynthesis;
  delete (window as any).SpeechSynthesisUtterance;
  delete (globalThis as any).SpeechSynthesisUtterance;
});

describe('speech.ts first-utterance clipping fix', () => {
  it('primes silently, keeps the leading mora and never cancels+speaks in one tick', async () => {
    /* 1. First real utterance: silent primer goes first, then the full text. */
    const first = installSpeechStub();
    let speech = await importSpeech();
    expect(speech.speechSupported).toBe(true);

    speech.speak('うみ');

    // The primer is emitted synchronously, before any real audio.
    expect(first.log.spoken).toHaveLength(1);
    const primer = first.log.spoken[0];
    expect(primer.text).toBe('。');
    expect(primer.volume).toBe(0);
    expect(primer.rate).toBe(10);
    expect(first.log.cancels).toBe(0);

    await vi.advanceTimersByTimeAsync(200);

    expect(first.log.spoken).toHaveLength(2);
    const real = first.log.spoken[1];
    // Exact full string: the clipped "み" regression would fail here.
    expect(real.text).toBe('うみ');
    expect(real.text[0]).toBe('う');
    expect(real.voice?.lang).toBe('ja-JP');
    expect(real.lang).toBe('ja-JP');
    // Nothing cancelled before the very first real utterance.
    expect(first.log.cancels).toBe(0);

    /* 2. cancel() and speak() must not run in the same tick. */
    const busy = installSpeechStub();
    speech = await importSpeech();
    speech.speak('ウォームアップ');
    await vi.advanceTimersByTimeAsync(200);
    busy.log.spoken.length = 0;
    busy.log.cancels = 0;

    busy.synth.speaking = true;
    speech.speak('こんにちは');

    expect(busy.log.cancels).toBe(1);
    expect(busy.log.spoken).toHaveLength(0); // no speak in the same tick

    await vi.advanceTimersByTimeAsync(199);
    expect(busy.log.spoken).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(2);
    expect(busy.log.spoken.map((u) => u.text)).toEqual(['こんにちは']);

    /* 3. Latest call wins; stopSpeaking() kills the scheduled utterance. */
    const quick = installSpeechStub();
    speech = await importSpeech();
    speech.speak('ウォームアップ');
    await vi.advanceTimersByTimeAsync(200);
    quick.log.spoken.length = 0;
    quick.log.cancels = 0;

    quick.synth.speaking = true;
    speech.speak('A');
    speech.speak('B');

    await vi.advanceTimersByTimeAsync(400);
    expect(quick.log.spoken.map((u) => u.text)).toEqual(['B']);

    quick.log.spoken.length = 0;
    quick.synth.speaking = true;
    speech.speak('C');
    speech.stopSpeaking();
    await vi.advanceTimersByTimeAsync(400);
    expect(quick.log.spoken).toHaveLength(0);

    /* 4. Empty voice list: the first real utterance waits for voices, not clipping. */
    const voiceless = installSpeechStub({ voicesReady: false });
    speech = await importSpeech();
    speech.speak('うみ');

    expect(voiceless.log.spoken).toHaveLength(1);
    expect(voiceless.log.spoken[0].volume).toBe(0);

    await vi.advanceTimersByTimeAsync(300);
    expect(voiceless.log.spoken).toHaveLength(1); // still waiting for voices

    await vi.advanceTimersByTimeAsync(300);
    expect(voiceless.log.spoken).toHaveLength(1); // t≈600ms: still inside the 500ms wait

    await vi.advanceTimersByTimeAsync(300); // past 120ms + 500ms
    expect(voiceless.log.spoken.map((u) => u.text)).toEqual(['。', 'うみ']);
    expect(voiceless.log.spoken[1].lang).toBe('ja-JP');
  });
});
