import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TypingField from '../src/features/lesson/exercises/TypingField';
import ListenTyping from '../src/features/lesson/exercises/ListenTyping';
import { kanaToRomaji, normalizeAnswer, readingHint } from '../src/features/lesson/lessonEngine';
import type { TypingExercise } from '../src/types';
import { UNITS } from '../src/content';

const EXERCISE: TypingExercise = {
  id: 'u1-l1-e4',
  kind: 'typing',
  prompt: 'Viết bằng tiếng Nhật',
  text: 'Tạm biệt',
  accepted: ['さようなら', 'sayounara', 'sayonara'],
  answerLabel: 'さようなら',
};

const LISTEN: TypingExercise = {
  id: 'u1-l1-e5',
  kind: 'listen-typing',
  prompt: 'Nghe và viết lại',
  audioText: 'こんばんは',
  accepted: ['こんばんは', 'konbanwa'],
  answerLabel: 'こんばんは',
};

describe('kanaToRomaji', () => {
  it('converts kana to readable romaji', () => {
    expect(kanaToRomaji('さようなら')).toBe('sayounara');
    expect(kanaToRomaji('おちゃ')).toBe('ocha');
    expect(kanaToRomaji('すし')).toBe('sushi');
    expect(kanaToRomaji('わたし')).toBe('watashi');
  });

  it('handles sokuon, long vowels and katakana', () => {
    expect(kanaToRomaji('がっこう')).toBe('gakkou');
    expect(kanaToRomaji('コーヒー')).toBe('koohii');
    expect(kanaToRomaji('こんばんは')).toBe('konbanha');
  });

  it('passes unknown characters through instead of crashing', () => {
    expect(kanaToRomaji('')).toBe('');
    expect(kanaToRomaji('abc')).toBe('abc');
  });
});

describe('readingHint', () => {
  it('is always an answer the grader accepts, for every typing exercise', () => {
    for (const unit of UNITS) {
      for (const lesson of unit.lessons) {
        for (const exercise of lesson.exercises) {
          if (exercise.kind !== 'typing' && exercise.kind !== 'listen-typing') continue;
          const hint = readingHint(exercise);
          const accepted = exercise.accepted.some(
            (variant) => normalizeAnswer(variant) === normalizeAnswer(hint),
          );
          expect(accepted, `${exercise.id} hint "${hint}" not accepted`).toBe(true);
        }
      }
    }
  });

  it('falls back to kana conversion when there is no latin variant', () => {
    expect(readingHint({ accepted: ['さようなら'], answerLabel: 'さようなら' })).toBe('sayounara');
  });
});

describe('TypingField — beginner scaffolding', () => {
  it('tells the learner romaji is accepted', () => {
    render(<TypingField exercise={EXERCISE} value="" disabled={false} onChange={() => {}} />);
    expect(screen.getByTestId('typing-input')).toBeInTheDocument();
    expect(screen.getByText(/romaji/i)).toBeInTheDocument();
  });

  it('opens the kana pad by default for beginners and inserts kana', () => {
    const onChange = vi.fn();
    render(
      <TypingField
        exercise={EXERCISE}
        value=""
        disabled={false}
        onChange={onChange}
        beginner
      />,
    );

    expect(screen.getByTestId('kana-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'Bảng kana' })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('kana-さ'));
    expect(onChange).toHaveBeenCalledWith('さ');

    fireEvent.click(screen.getByTestId('kana-backspace'));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('keeps the kana pad collapsed outside beginner units', () => {
    render(<TypingField exercise={EXERCISE} value="" disabled={false} onChange={() => {}} />);
    expect(screen.getByTestId('kana-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'Bảng kana' })).toBeNull();

    fireEvent.click(screen.getByTestId('kana-toggle'));
    expect(screen.getByRole('group', { name: 'Bảng kana' })).toBeInTheDocument();
  });

  it('reveals the romaji reading on demand', () => {
    render(<TypingField exercise={EXERCISE} value="" disabled={false} onChange={() => {}} />);
    expect(screen.queryByTestId('reading-hint')).toBeNull();

    fireEvent.click(screen.getByTestId('reading-hint-toggle'));
    expect(screen.getByTestId('reading-hint')).toHaveTextContent('sayounara');
  });

  it('never hints a romaji the grader would reject (particle は → wa)', () => {
    const particle: TypingExercise = {
      id: 'u1-l1-e5',
      kind: 'listen-typing',
      prompt: 'Nghe và viết lại',
      audioText: 'こんばんは',
      accepted: ['こんばんは', 'konbanwa'],
      answerLabel: 'こんばんは',
    };

    render(<TypingField exercise={particle} value="" disabled={false} onChange={() => {}} />);
    fireEvent.click(screen.getByTestId('reading-hint-toggle'));
    /* kanaToRomaji would say "konbanha", which the lesson marks wrong. */
    expect(screen.getByTestId('reading-hint')).toHaveTextContent('konbanwa');
    expect(screen.getByTestId('reading-hint')).not.toHaveTextContent('konbanha');
  });
});

describe('ListenTyping — beginner scaffolding', () => {
  it('renders a single input, an audio button and the kana pad', () => {
    const onSpeak = vi.fn();
    render(
      <ListenTyping
        exercise={LISTEN}
        value=""
        disabled={false}
        onChange={() => {}}
        onSpeak={onSpeak}
        beginner
      />,
    );

    expect(screen.getAllByTestId('typing-input')).toHaveLength(1);
    expect(screen.getByText(/romaji cũng được/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('listen-button'));
    expect(onSpeak).toHaveBeenCalledWith('こんばんは');
  });
});
