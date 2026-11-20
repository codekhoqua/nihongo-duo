/**
 * TEMP STUB — will be fully replaced by the real course content.
 * Keeps the app compiling so the lesson engine can be built in parallel.
 */
import type { Lesson, Unit } from '../types';

const helloLesson: Lesson = {
  id: 'u1-l1',
  unitId: 'u1',
  title: 'Chào hỏi',
  subtitle: 'Xin chào, tạm biệt',
  icon: 'star',
  xp: 10,
  tip: 'こんにちは dùng từ trưa đến chiều tối.',
  exercises: [
    {
      id: 'u1-l1-e1',
      kind: 'translate-choice',
      prompt: 'Chọn nghĩa đúng',
      japanese: 'こんにちは',
      reading: 'konnichiwa',
      audioText: 'こんにちは',
      choices: [
        { id: 'a', label: 'Xin chào' },
        { id: 'b', label: 'Tạm biệt' },
        { id: 'c', label: 'Cảm ơn' },
      ],
      answerId: 'a',
      explanation: 'こんにちは = Xin chào (dùng ban ngày).',
    },
    {
      id: 'u1-l1-e2',
      kind: 'word-bank',
      prompt: 'Dịch câu này',
      text: 'Tôi là học sinh',
      tokens: ['わたし', 'は', 'がくせい', 'です', 'せんせい'],
      answerTokens: ['わたし', 'は', 'がくせい', 'です'],
      audioText: 'わたしはがくせいです',
    },
  ],
};

const thanksLesson: Lesson = {
  id: 'u1-l2',
  unitId: 'u1',
  title: 'Cảm ơn',
  subtitle: 'ありがとう',
  icon: 'book',
  xp: 10,
  exercises: [
    {
      id: 'u1-l2-e1',
      kind: 'typing',
      prompt: 'Viết bằng tiếng Nhật',
      text: 'Cảm ơn',
      accepted: ['ありがとう', 'arigatou', 'arigato'],
      answerLabel: 'ありがとう',
      audioText: 'ありがとう',
    },
  ],
};

export const UNITS: Unit[] = [
  {
    id: 'u1',
    index: 1,
    title: 'Unit 1',
    subtitle: 'Chào hỏi cơ bản',
    color: '#58cc02',
    lessons: [helloLesson, thanksLesson],
  },
];

export const ALL_LESSON_IDS: string[] = UNITS.flatMap((u) => u.lessons.map((l) => l.id));

export const TOTAL_LESSONS = ALL_LESSON_IDS.length;

export function getLesson(lessonId: string): Lesson | undefined {
  for (const unit of UNITS) {
    const found = unit.lessons.find((l) => l.id === lessonId);
    if (found) return found;
  }
  return undefined;
}

export function getUnit(unitId: string): Unit | undefined {
  return UNITS.find((u) => u.id === unitId);
}

export function getUnitOfLesson(lessonId: string): Unit | undefined {
  return UNITS.find((u) => u.lessons.some((l) => l.id === lessonId));
}

export function lessonIdsOfUnit(unitId: string): string[] {
  return getUnit(unitId)?.lessons.map((l) => l.id) ?? [];
}
