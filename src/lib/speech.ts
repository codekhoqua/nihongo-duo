/**
 * Japanese text-to-speech via the Web Speech API.
 * Falls back silently when the browser has no Japanese voice.
 */

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported) return null;
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  cachedVoice =
    voices.find((v) => v.lang === 'ja-JP') ??
    voices.find((v) => v.lang?.toLowerCase().startsWith('ja')) ??
    null;
  return cachedVoice;
}

if (speechSupported) {
  // Voices can load asynchronously.
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
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

export function speak(text: string, options: SpeakOptions = {}): void {
  const { rate = 0.85, enabled = true } = options;
  if (!enabled || !speechSupported || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;
    utterance.pitch = 1;
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* TTS is a nice-to-have; never break a lesson over it. */
  }
}

export function stopSpeaking(): void {
  if (!speechSupported) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
