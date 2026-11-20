import { describe, expect, it } from 'vitest';
import {
  ALL_LESSON_IDS,
  HIRAGANA,
  KANA_ROWS,
  KATAKANA,
  TOTAL_LESSONS,
  UNITS,
  VOCAB,
  getLesson,
  getUnit,
  getUnitOfLesson,
} from '../src/content';
import type { Lesson, Unit } from '../src/types';

const allLessons: Array<{ unit: Unit; lesson: Lesson }> = UNITS.flatMap((unit) =>
  unit.lessons.map((lesson) => ({ unit, lesson })),
);

const allExercises = allLessons.flatMap(({ lesson }) =>
  lesson.exercises.map((exercise) => ({ lesson, exercise })),
);

function countOf(values: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return map;
}

describe('course structure', () => {
  it('has at least 5 units and 25 lessons', () => {
    expect(UNITS.length).toBeGreaterThanOrEqual(5);
    expect(TOTAL_LESSONS).toBeGreaterThanOrEqual(25);
    expect(allLessons.length).toBe(TOTAL_LESSONS);
  });

  it('unit.index is 1..n in ascending order', () => {
    expect(UNITS.map((unit) => unit.index)).toEqual(UNITS.map((_, index) => index + 1));
  });

  it('unit ids are unique and every unit has a valid #rrggbb colour', () => {
    expect(new Set(UNITS.map((unit) => unit.id)).size).toBe(UNITS.length);
    for (const unit of UNITS) {
      expect(unit.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(unit.title.trim().length).toBeGreaterThan(0);
    }
  });

  it('lesson ids are globally unique and match the u<unit>-l<n> pattern', () => {
    const ids = allLessons.map(({ lesson }) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ALL_LESSON_IDS).toEqual(ids);
    for (const id of ids) expect(id).toMatch(/^u\d+-l\d+$/);
  });

  it('exposes consistent lookup helpers', () => {
    const first = allLessons[0];
    expect(getLesson(first.lesson.id)).toBe(first.lesson);
    expect(getUnit(first.unit.id)).toBe(first.unit);
    expect(getUnitOfLesson(first.lesson.id)).toBe(first.unit);
    expect(getLesson('nope-nope')).toBeUndefined();
  });
});

describe.each(allLessons)('lesson $lesson.id', ({ unit, lesson }) => {
  it('belongs to the unit that contains it', () => {
    expect(lesson.unitId).toBe(unit.id);
  });

  it('has 6–8 exercises', () => {
    expect(lesson.exercises.length).toBeGreaterThanOrEqual(6);
    expect(lesson.exercises.length).toBeLessThanOrEqual(8);
  });

  it('mixes at least 3 exercise kinds', () => {
    const kinds = new Set(lesson.exercises.map((exercise) => exercise.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  it('grants a positive XP amount', () => {
    expect(typeof lesson.xp).toBe('number');
    expect(lesson.xp as number).toBeGreaterThan(0);
  });

  it('has unique exercise ids matching the pattern', () => {
    const ids = lesson.exercises.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^u\d+-l\d+-e\d+$/);
  });

  it('never has an empty prompt', () => {
    for (const exercise of lesson.exercises) {
      expect(exercise.prompt.trim().length).toBeGreaterThan(0);
    }
  });
});

describe.each(allExercises)('exercise $exercise.id', ({ exercise }) => {
  it('choice exercises have 3–4 unique choices and a valid answerId', () => {
    if (exercise.kind !== 'translate-choice' && exercise.kind !== 'fill-blank') return;
    expect(exercise.choices.length).toBeGreaterThanOrEqual(3);
    expect(exercise.choices.length).toBeLessThanOrEqual(4);
    const ids = exercise.choices.map((choice) => choice.id);
    expect(new Set(ids).size).toBe(ids.length);
    const labels = exercise.choices.map((choice) => choice.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(ids).toContain(exercise.answerId);
    for (const label of labels) expect(label.trim().length).toBeGreaterThan(0);
  });

  it('select-image has exactly 4 emoji tiles and a valid answerId', () => {
    if (exercise.kind !== 'select-image') return;
    expect(exercise.choices).toHaveLength(4);
    expect(new Set(exercise.choices.map((choice) => choice.id)).size).toBe(4);
    for (const choice of exercise.choices) {
      expect(typeof choice.emoji).toBe('string');
      expect((choice.emoji ?? '').length).toBeGreaterThan(0);
    }
    expect(exercise.choices.map((choice) => choice.id)).toContain(exercise.answerId);
  });

  it('word-bank tokens contain the answer multiset plus distractors', () => {
    if (exercise.kind !== 'word-bank') return;
    expect(exercise.answerTokens.length).toBeGreaterThanOrEqual(2);
    expect(exercise.tokens.length).toBeGreaterThan(exercise.answerTokens.length);
    expect(exercise.text.trim().length).toBeGreaterThan(0);
    const pool = countOf(exercise.tokens);
    for (const [token, needed] of countOf(exercise.answerTokens)) {
      expect(token.trim().length).toBeGreaterThan(0);
      expect(pool.get(token) ?? 0).toBeGreaterThanOrEqual(needed);
    }
  });

  it('typing exercises accept ≥2 variants incl. romaji and a label', () => {
    if (exercise.kind !== 'typing' && exercise.kind !== 'listen-typing') return;
    expect(exercise.accepted.length).toBeGreaterThanOrEqual(2);
    expect(exercise.answerLabel.trim().length).toBeGreaterThan(0);
    expect(exercise.accepted.some((variant) => /[A-Za-z]/.test(variant))).toBe(true);
  });

  it('match-pairs has exactly 4 unique pairs', () => {
    if (exercise.kind !== 'match-pairs') return;
    expect(exercise.pairs).toHaveLength(4);
    expect(new Set(exercise.pairs.map((pair) => pair.id)).size).toBe(4);
    const lefts = exercise.pairs.map((pair) => pair.left);
    const rights = exercise.pairs.map((pair) => pair.right);
    expect(new Set(lefts).size).toBe(4);
    expect(new Set(rights).size).toBe(4);
    for (const value of [...lefts, ...rights]) expect(value.trim().length).toBeGreaterThan(0);
  });
});

describe('vocabulary & kana', () => {
  it('VOCAB has at least 120 unique entries with kana/romaji/meaning', () => {
    expect(VOCAB.length).toBeGreaterThanOrEqual(120);
    expect(new Set(VOCAB.map((word) => word.id)).size).toBe(VOCAB.length);
    for (const word of VOCAB) {
      expect(word.kana.trim().length).toBeGreaterThan(0);
      expect(word.romaji.trim().length).toBeGreaterThan(0);
      expect(word.meaning.trim().length).toBeGreaterThan(0);
    }
  });

  it('has ≥46 hiragana and ≥46 katakana with unique ids', () => {
    expect(HIRAGANA.length).toBeGreaterThanOrEqual(46);
    expect(KATAKANA.length).toBeGreaterThanOrEqual(46);
    expect(new Set(HIRAGANA.map((char) => char.id)).size).toBe(HIRAGANA.length);
    expect(new Set(KATAKANA.map((char) => char.id)).size).toBe(KATAKANA.length);
  });

  it('KANA_ROWS covers both scripts', () => {
    expect(Object.keys(KANA_ROWS).sort()).toEqual(['hiragana', 'katakana']);
    expect(KANA_ROWS.hiragana.length).toBeGreaterThan(0);
    expect(KANA_ROWS.katakana.length).toBeGreaterThan(0);
  });
});

describe('content census', () => {
  it('prints unit / lesson / exercise / kind distribution', () => {
    const kindCounts = new Map<string, number>();
    for (const { exercise } of allExercises) {
      kindCounts.set(exercise.kind, (kindCounts.get(exercise.kind) ?? 0) + 1);
    }
    const kindLine = [...kindCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([kind, count]) => `${kind}=${count}`)
      .join(', ');

    console.log(
      [
        `units=${UNITS.length}`,
        `lessons=${allLessons.length}`,
        `exercises=${allExercises.length}`,
        `vocab=${VOCAB.length}`,
        `hiragana=${HIRAGANA.length}`,
        `katakana=${KATAKANA.length}`,
        `kinds: ${kindLine}`,
        `per-unit lessons: ${UNITS.map((unit) => `${unit.id}:${unit.lessons.length}`).join(' ')}`,
      ].join('\n'),
    );

    expect(allExercises.length).toBeGreaterThan(0);
  });
});
