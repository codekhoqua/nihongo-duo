/**
 * Course content entry point.
 * Units are split per file so the course stays easy to extend.
 */
import type { Lesson, Unit } from '../types';
import { U1 } from './units/u1';
import { U2 } from './units/u2';
import { U3 } from './units/u3';
import { U4 } from './units/u4';
import { U5 } from './units/u5';
import { U6 } from './units/u6';

export { VOCAB } from './vocab';
export { HIRAGANA, KATAKANA, KANA_ROWS } from './kana';

export const UNITS: Unit[] = [U1, U2, U3, U4, U5, U6];

export const ALL_LESSON_IDS: string[] = UNITS.flatMap((unit) => unit.lessons.map((lesson) => lesson.id));

export const TOTAL_LESSONS = ALL_LESSON_IDS.length;

export function getLesson(lessonId: string): Lesson | undefined {
  for (const unit of UNITS) {
    const found = unit.lessons.find((lesson) => lesson.id === lessonId);
    if (found) return found;
  }
  return undefined;
}

export function getUnit(unitId: string): Unit | undefined {
  return UNITS.find((unit) => unit.id === unitId);
}

export function getUnitOfLesson(lessonId: string): Unit | undefined {
  return UNITS.find((unit) => unit.lessons.some((lesson) => lesson.id === lessonId));
}

export function lessonIdsOfUnit(unitId: string): string[] {
  return getUnit(unitId)?.lessons.map((lesson) => lesson.id) ?? [];
}
