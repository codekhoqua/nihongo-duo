import { describe, expect, it } from 'vitest';
import {
  gradeLesson,
  isTypingCorrect,
  isWordBankCorrect,
  normalizeAnswer,
  shuffle,
} from '../src/features/lesson/lessonEngine';

describe('normalizeAnswer', () => {
  it('NFKC: fullwidth → ASCII, strips punctuation and trims/collapses spaces', () => {
    expect(normalizeAnswer('  ＡＲＩＧＡＴＯＵ！ ')).toBe('arigatou');
  });

  it('katakana → hiragana and drops the ideographic full stop', () => {
    expect(normalizeAnswer('アリガトウ。')).toBe('ありがとう');
  });

  it('empty string stays empty', () => {
    expect(normalizeAnswer('')).toBe('');
  });

  it('drops macrons (ō → o) and lowercases', () => {
    expect(normalizeAnswer('Tōkyō')).toBe('tokyo');
    expect(normalizeAnswer('Ōsaka')).toBe('osaka');
  });

  it('strips ! ? . , 、 。 … and hyphens', () => {
    expect(normalizeAnswer('kon-nichiwa!?')).toBe('konnichiwa');
    expect(normalizeAnswer('はい、そうです。')).toBe('はいそうです');
  });

  it('collapses internal whitespace runs', () => {
    expect(normalizeAnswer('  watashi   wa  ')).toBe('watashi wa');
  });

  it('NFKC folds half-width katakana + dakuten into one kana', () => {
    expect(normalizeAnswer('ｶﾞ')).toBe('が');
  });

  it('is idempotent', () => {
    const once = normalizeAnswer('ＡＲＩＧＡＴＯＵ！');
    expect(normalizeAnswer(once)).toBe(once);
  });
});

describe('isTypingCorrect', () => {
  const accepted = ['さようなら', 'sayounara', 'sayonara'];

  it('empty input is always wrong', () => {
    expect(isTypingCorrect('', accepted)).toBe(false);
    expect(isTypingCorrect('   ', accepted)).toBe(false);
  });

  it('matches after normalization', () => {
    expect(isTypingCorrect('  Sayounara!  ', accepted)).toBe(true);
    expect(isTypingCorrect('さようなら。', accepted)).toBe(true);
  });

  it('every accepted variant passes', () => {
    for (const variant of accepted) {
      expect(isTypingCorrect(variant, accepted)).toBe(true);
    }
  });

  it('wrong input fails', () => {
    expect(isTypingCorrect('goodbye', accepted)).toBe(false);
    expect(isTypingCorrect('さようならで', accepted)).toBe(false);
  });

  it('empty accepted list never matches', () => {
    expect(isTypingCorrect('anything', [])).toBe(false);
  });
});

describe('isWordBankCorrect', () => {
  const answer = ['わたしは', '学生', 'です'];

  it('same tokens in the same order → true', () => {
    expect(isWordBankCorrect(['わたしは', '学生', 'です'], answer)).toBe(true);
  });

  it('right tokens, wrong order → false', () => {
    expect(isWordBankCorrect(['学生', 'わたしは', 'です'], answer)).toBe(false);
  });

  it('missing token → false', () => {
    expect(isWordBankCorrect(['わたしは', '学生'], answer)).toBe(false);
  });

  it('extra token → false', () => {
    expect(isWordBankCorrect(['わたしは', '学生', 'です', 'か'], answer)).toBe(false);
  });

  it('normalizes each token (padding / punctuation)', () => {
    expect(isWordBankCorrect([' わたしは ', '学生。', 'です'], answer)).toBe(true);
  });

  it('empty answer only matches empty selection', () => {
    expect(isWordBankCorrect([], [])).toBe(true);
    expect(isWordBankCorrect(['x'], [])).toBe(false);
  });
});

describe('gradeLesson', () => {
  it('all correct → 100 accuracy, perfect, base xp + 5 bonus', () => {
    expect(gradeLesson(10, 10, 10)).toEqual({ accuracy: 100, perfect: true, xp: 15 });
  });

  it('zero correct, zero total → no accuracy, not perfect, xp at least 1', () => {
    const grade = gradeLesson(0, 0, 10);
    expect(grade.accuracy).toBe(0);
    expect(grade.perfect).toBe(false);
    expect(grade.xp).toBeGreaterThanOrEqual(1);
  });

  it('clamps correct > total', () => {
    expect(gradeLesson(12, 10, 10)).toEqual({ accuracy: 100, perfect: true, xp: 15 });
  });

  it('clamps negative correct to 0', () => {
    const grade = gradeLesson(-4, 10, 10);
    expect(grade.accuracy).toBe(0);
    expect(grade.perfect).toBe(false);
  });

  it('rounds accuracy', () => {
    expect(gradeLesson(1, 3, 10).accuracy).toBe(33);
    expect(gradeLesson(2, 3, 10).accuracy).toBe(67);
  });

  it('never returns xp below 1 for a non-perfect lesson', () => {
    const grade = gradeLesson(1, 10, 0);
    expect(grade.perfect).toBe(false);
    expect(grade.xp).toBeGreaterThanOrEqual(1);
  });

  it('adds the +5 perfect bonus on top of a custom xp value', () => {
    expect(gradeLesson(5, 5, 20).xp).toBe(25);
  });
});

describe('shuffle', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it('does not mutate the input array', () => {
    const copy = [...input];
    shuffle(input, 123);
    expect(input).toEqual(copy);
  });

  it('same seed → same order', () => {
    expect(shuffle(input, 1)).toEqual(shuffle(input, 1));
    expect(shuffle(input, 42)).toEqual(shuffle(input, 42));
  });

  it('different seeds → different order', () => {
    expect(shuffle(input, 1)).not.toEqual(shuffle(input, 2));
    expect(shuffle(input, 7)).not.toEqual(shuffle(input, 42));
  });

  it('keeps the multiset of elements', () => {
    const out = shuffle(input, 99);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b));
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([], 5)).toEqual([]);
    expect(shuffle(['only'], 5)).toEqual(['only']);
  });

  it('returns a new array instance', () => {
    expect(shuffle(input, 3)).not.toBe(input);
  });
});
