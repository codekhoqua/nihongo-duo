/**
 * Pure lesson logic — no React, no DOM, no side effects.
 * Everything in here is unit-tested directly, so keep it deterministic.
 */
import { HIRAGANA } from '../../content/kana';

const KATAKANA_BLOCK = /[\u30a1-\u30f6]/g;

/** Macron vowels → plain vowels (Hepburn romaji without macrons). */
const MACRON_TO_PLAIN: Record<string, string> = {
  ā: 'a',
  ī: 'i',
  ū: 'u',
  ē: 'e',
  ō: 'o',
  Ā: 'a',
  Ī: 'i',
  Ū: 'u',
  Ē: 'e',
  Ō: 'o',
};

/**
 * Canonical form used for every answer comparison:
 * NFKC → katakana to hiragana → macrons dropped → lowercase →
 * punctuation & hyphens stripped → whitespace collapsed & trimmed.
 */
export function normalizeAnswer(s: string): string {
  if (!s) return '';
  let out = s.normalize('NFKC');
  out = out.replace(KATAKANA_BLOCK, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  out = out.replace(/[āīūēōĀĪŪĒŌ]/g, (ch) => MACRON_TO_PLAIN[ch] ?? ch);
  out = out.toLowerCase();
  out = out.replace(/[!?.,、。…\-–—]/g, '');
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

/** Typed answer matches any accepted variant. Empty input is always wrong. */
export function isTypingCorrect(input: string, accepted: string[]): boolean {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  return accepted.some((candidate) => normalizeAnswer(candidate) === normalized);
}

/** Small kana that are not part of the 46 basic chart. */
const SMALL_KANA_ROMAJI: Record<string, string> = {
  'ゃ': 'ya',
  'ゅ': 'yu',
  'ょ': 'yo',
  'ぁ': 'a',
  'ぃ': 'i',
  'ぅ': 'u',
  'ぇ': 'e',
  'ぉ': 'o',
};

/** char → romaji, built once from the kana chart (hiragana only). */
const KANA_TO_ROMAJI: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const kana of HIRAGANA) map[kana.char] = kana.romaji;
  return { ...map, ...SMALL_KANA_ROMAJI };
})();

/** Digraphs: base kana + small ゃ/ゅ/ょ. */
const YOON_ROMAJI: Record<string, string> = {
  'きゃ': 'kya',
  'きゅ': 'kyu',
  'きょ': 'kyo',
  'しゃ': 'sha',
  'しゅ': 'shu',
  'しょ': 'sho',
  'ちゃ': 'cha',
  'ちゅ': 'chu',
  'ちょ': 'cho',
  'にゃ': 'nya',
  'にゅ': 'nyu',
  'にょ': 'nyo',
  'ひゃ': 'hya',
  'ひゅ': 'hyu',
  'ひょ': 'hyo',
  'みゃ': 'mya',
  'みゅ': 'myu',
  'みょ': 'myo',
  'りゃ': 'rya',
  'りゅ': 'ryu',
  'りょ': 'ryo',
  'ぎゃ': 'gya',
  'ぎゅ': 'gyu',
  'ぎょ': 'gyo',
  'じゃ': 'ja',
  'じゅ': 'ju',
  'じょ': 'jo',
  'びゃ': 'bya',
  'びゅ': 'byu',
  'びょ': 'byo',
  'ぴゃ': 'pya',
  'ぴゅ': 'pyu',
  'ぴょ': 'pyo',
};

const VOWELS = 'aeiou';

/**
 * Kana → readable romaji, used for the beginner "cách đọc" hint.
 * Handles katakana input, digraphs (ちゃ → cha), small っ (doubled consonant)
 * and ー (long vowel). Unknown characters (kanji, latin) pass through unchanged.
 */
export function kanaToRomaji(kana: string): string {
  if (!kana) return '';
  const chars = [...kana.normalize('NFKC').replace(KATAKANA_BLOCK, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  )];
  let out = '';
  let pendingSokuon = false;

  for (let index = 0; index < chars.length; index += 1) {
    const ch = chars[index];

    if (ch === 'っ') {
      pendingSokuon = true;
      continue;
    }
    if (ch === 'ー') {
      const last = out.slice(-1);
      if (VOWELS.includes(last)) out += last;
      continue;
    }

    const digraph = YOON_ROMAJI[ch + (chars[index + 1] ?? '')];
    const romaji = digraph ?? KANA_TO_ROMAJI[ch];

    if (romaji === undefined) {
      out += ch;
      pendingSokuon = false;
      continue;
    }
    if (digraph) index += 1;

    if (pendingSokuon) {
      out += romaji[0];
      pendingSokuon = false;
    }
    out += romaji;
  }
  /* A trailing っ has no next consonant to double. */
  return out;
}

/** Romaji hint shown to beginners: prefer a variant the grader really accepts. */
export function readingHint(exercise: { accepted: string[]; answerLabel: string }): string {
  const latin = exercise.accepted.find((variant) => /^[a-z][a-z\s]*$/i.test(variant));
  return latin ?? kanaToRomaji(exercise.answerLabel);
}

/** Word-bank answer: same tokens in the same order (normalized per token). */
export function isWordBankCorrect(selected: string[], answer: string[]): boolean {
  if (selected.length !== answer.length) return false;
  return selected.every((token, index) => normalizeAnswer(token) === normalizeAnswer(answer[index]));
}

export interface LessonGrade {
  accuracy: number;
  perfect: boolean;
  xp: number;
}

/** Accuracy, perfect flag and XP (with a +5 perfect bonus). */
export function gradeLesson(correct: number, total: number, xpPerLesson: number): LessonGrade {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeCorrect = Math.max(0, Math.min(Math.floor(correct), safeTotal));
  const accuracy = safeTotal > 0 ? Math.round((safeCorrect / safeTotal) * 100) : 0;
  const perfect = safeTotal > 0 && safeCorrect === safeTotal;
  const rounded = Math.round(xpPerLesson);
  const base = Math.max(1, Number.isFinite(rounded) ? rounded : 1);
  return { accuracy, perfect, xp: base + (perfect ? 5 : 0) };
}

/** Deterministic Fisher–Yates shuffle (LCG) on a copy. Same seed → same order. */
export function shuffle<T>(items: T[], seed?: number): T[] {
  const out = items.slice();
  const raw = typeof seed === 'number' && Number.isFinite(seed) ? seed : Date.now();
  let state = Math.floor(raw) >>> 0;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
