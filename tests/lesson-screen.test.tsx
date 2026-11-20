import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { ProgressProvider, STORAGE_KEY, DEFAULT_STATE } from '../src/store';
import LessonScreen from '../src/features/lesson/LessonScreen';
import PathScreen from '../src/features/path/PathScreen';
import ShopScreen from '../src/features/screens/ShopScreen';
import { getLesson } from '../src/content';
import type { Exercise, ProgressState } from '../src/types';

const LESSON = getLesson('u1-l1');
if (!LESSON) throw new Error('u1-l1 missing from content');

function seed(partial: Partial<ProgressState> = {}) {
  const state: ProgressState = { ...DEFAULT_STATE, completedLessons: ['u1-l1'], ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: 0 }));
}

function read(): ProgressState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as ProgressState) : null;
}

const pause = (ms: number) => act(async () => new Promise((r) => setTimeout(r, ms)));

function answerCorrectly(exercise: Exercise) {
  switch (exercise.kind) {
    case 'translate-choice':
    case 'fill-blank':
      fireEvent.click(screen.getByTestId(`choice-${exercise.answerId}`));
      break;
    case 'select-image':
      fireEvent.click(screen.getByTestId(`image-${exercise.answerId}`));
      break;
    case 'typing':
    case 'listen-typing':
      fireEvent.change(screen.getByTestId('typing-input'), {
        target: { value: exercise.answerLabel },
      });
      break;
    case 'word-bank':
      for (const token of exercise.answerTokens) {
        const pool = Array.from(
          document.querySelectorAll<HTMLButtonElement>('[data-testid^="token-"]'),
        ).filter((btn) => !btn.closest('[data-testid="bank-answer"]'));
        const match = pool.find((btn) => (btn.textContent ?? '').trim() === token);
        if (!match) throw new Error(`token not found in pool: ${token}`);
        fireEvent.click(match);
      }
      break;
    default:
      break;
  }
}

function clickMatchCard(column: number, text: string) {
  const cols = document.querySelectorAll('.match-col');
  const button = Array.from(cols[column]?.querySelectorAll('button') ?? []).find(
    (btn) => (btn.textContent ?? '').trim() === text,
  );
  if (!button) throw new Error(`match card not found: ${text}`);
  fireEvent.click(button);
}

async function submitAndContinue() {
  const check = screen.getByTestId('check-button') as HTMLButtonElement;
  await waitFor(() => expect(check.disabled).toBe(false));
  fireEvent.click(check);
  const next = await screen.findByTestId('continue-button');
  fireEvent.click(next);
  await waitFor(() => expect(screen.queryByTestId('continue-button')).toBeNull());
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('PathScreen — học miễn phí, không chặn vì tim', () => {
  it('vẫn mở bài khi localStorage cũ còn hearts = 0', async () => {
    const legacy = { ...DEFAULT_STATE, hearts: 0, maxHearts: 5, completedLessons: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...legacy, version: 0 }));
    const started: string[] = [];
    render(
      <ProgressProvider>
        <PathScreen onStartLesson={(id) => started.push(id)} />
      </ProgressProvider>,
    );

    fireEvent.click(await screen.findByTestId('lesson-node-u1-l1'));

    expect(started).toEqual(['u1-l1']);
    expect(screen.queryByTestId('hearts-banner')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('cho mở bài bình thường với state mới (không còn tim)', async () => {
    seed({ completedLessons: [] });
    const started: string[] = [];
    render(
      <ProgressProvider>
        <PathScreen onStartLesson={(id) => started.push(id)} />
      </ProgressProvider>,
    );

    fireEvent.click(await screen.findByTestId('lesson-node-u1-l1'));
    expect(started).toEqual(['u1-l1']);
  });
});

describe('LessonScreen — trả lời sai', () => {
  it('hiện đáp án đúng và không trừ tim', async () => {
    seed({ completedLessons: [] });
    render(
      <ProgressProvider>
        <LessonScreen lessonId="u1-l1" onExit={() => undefined} />
      </ProgressProvider>,
    );

    const first = LESSON!.exercises[0];
    if (first.kind !== 'translate-choice') throw new Error('expected a translate-choice first');
    const wrong = first.choices.find((c) => c.id !== first.answerId)!;
    fireEvent.click(screen.getByTestId(`choice-${wrong.id}`));

    const check = screen.getByTestId('check-button') as HTMLButtonElement;
    await waitFor(() => expect(check.disabled).toBe(false));
    fireEvent.click(check);

    const verdict = await screen.findByTestId('verdict');
    expect(verdict.textContent).toMatch(/sai rồi/i);
    expect(verdict.textContent).toMatch(/đáp án đúng/i);
    await waitFor(() => expect(read()?.totalAnswers).toBe(1));
    expect(read()).not.toHaveProperty('hearts');
  });
});

describe('LessonScreen — ghép cặp sai', () => {
  it('không đạt "hoàn hảo", không +5 XP, mỗi câu chỉ tính 1 answer', async () => {
    seed({ completedLessons: [] });
    const exits: string[] = [];
    render(
      <ProgressProvider>
        <LessonScreen lessonId="u1-l1" onExit={() => exits.push('exit')} />
      </ProgressProvider>,
    );

    for (const exercise of LESSON!.exercises) {
      if (exercise.kind === 'match-pairs') {
        // deliberate mistake: left of pair 0 with the right side of pair 1
        clickMatchCard(0, exercise.pairs[0].left);
        clickMatchCard(1, exercise.pairs[1].right);
        await pause(900);

        for (const pair of exercise.pairs) {
          clickMatchCard(0, pair.left);
          clickMatchCard(1, pair.right);
          await pause(150);
        }

        await screen.findByTestId('verdict');
        fireEvent.click(await screen.findByTestId('continue-button'));
        await waitFor(() => expect(screen.queryByTestId('continue-button')).toBeNull());
        continue;
      }

      answerCorrectly(exercise);
      await submitAndContinue();
    }

    const result = await screen.findByTestId('lesson-result');
    expect(result.textContent).not.toMatch(/hoàn hảo/i);
    expect(result.textContent).toMatch(/\+10\s*XP/i);

    fireEvent.click(await screen.findByTestId('result-continue'));
    await waitFor(() => expect(exits).toContain('exit'));

    const state = read();
    expect(state?.totalAnswers).toBe(LESSON!.exercises.length);
    expect(state).not.toHaveProperty('hearts');
  });
});

describe('ShopScreen — modal "Tính năng demo"', () => {
  it('giữ focus trong modal và đóng bằng Escape', async () => {
    seed();
    render(
      <ProgressProvider>
        <ShopScreen onBack={() => undefined} />
      </ProgressProvider>,
    );

    fireEvent.click(document.querySelector('.offer-card') as HTMLElement);
    const dialog = await screen.findByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
