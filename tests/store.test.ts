import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_STATE, STORAGE_KEY, loadState, progressReducer } from '../src/store';
import { todayISO } from '../src/lib/date';
import type { ProgressState } from '../src/types';

function base(overrides: Partial<ProgressState> = {}): ProgressState {
  return {
    ...DEFAULT_STATE,
    settings: { ...DEFAULT_STATE.settings },
    crowns: {},
    completedLessons: [],
    ...overrides,
  };
}

describe('progressReducer / answer', () => {
  it('increments totalAnswers and correctAnswers for a correct answer', () => {
    const next = progressReducer(base(), { type: 'answer', correct: true });
    expect(next.totalAnswers).toBe(1);
    expect(next.correctAnswers).toBe(1);
  });

  it('increments only totalAnswers for a wrong answer', () => {
    const next = progressReducer(base(), { type: 'answer', correct: false });
    expect(next.totalAnswers).toBe(1);
    expect(next.correctAnswers).toBe(0);
  });

  it('accumulates on top of existing counters and bumps version', () => {
    const start = base({ totalAnswers: 3, correctAnswers: 2, version: 7 });
    const next = progressReducer(start, { type: 'answer', correct: true });
    expect(next.totalAnswers).toBe(4);
    expect(next.correctAnswers).toBe(3);
    expect(next.version).toBe(8);
    expect(start.totalAnswers).toBe(3); // pure reducer: input untouched
  });
});

describe('progressReducer / complete-lesson', () => {
  it('adds xp, dailyXp, a crown, the lesson id, perfect gems and a first streak', () => {
    const next = progressReducer(base(), {
      type: 'complete-lesson',
      lessonId: 'u1-l1',
      xp: 10,
      perfect: true,
    });
    expect(next.xp).toBe(10);
    expect(next.dailyXp).toBe(10);
    expect(next.crowns['u1-l1']).toBe(1);
    expect(next.completedLessons).toEqual(['u1-l1']);
    expect(next.gems).toBe(DEFAULT_STATE.gems + 8);
    expect(next.perfectLessons).toBe(1);
    expect(next.streak).toBe(1);
    expect(next.longestStreak).toBe(1);
    expect(next.lastActiveDate).toBe(todayISO());
  });

  it('gives 3 gems for a non-perfect lesson', () => {
    const next = progressReducer(base(), {
      type: 'complete-lesson',
      lessonId: 'u1-l1',
      xp: 10,
      perfect: false,
    });
    expect(next.gems).toBe(DEFAULT_STATE.gems + 3);
    expect(next.perfectLessons).toBe(0);
  });

  it('does not duplicate the lesson id on replay but keeps stacking crowns/xp', () => {
    const once = progressReducer(base(), {
      type: 'complete-lesson',
      lessonId: 'u1-l1',
      xp: 10,
      perfect: true,
    });
    const twice = progressReducer(once, {
      type: 'complete-lesson',
      lessonId: 'u1-l1',
      xp: 10,
      perfect: true,
    });
    expect(twice.completedLessons).toEqual(['u1-l1']);
    expect(twice.crowns['u1-l1']).toBe(2);
    expect(twice.xp).toBe(20);
    expect(twice.dailyXp).toBe(20);
    expect(twice.streak).toBe(1); // same day → streak unchanged
  });

  it('caps crowns at 5', () => {
    const next = progressReducer(base({ crowns: { 'u1-l1': 5 } }), {
      type: 'complete-lesson',
      lessonId: 'u1-l1',
      xp: 10,
      perfect: true,
    });
    expect(next.crowns['u1-l1']).toBe(5);
  });

  it('resets dailyXp and restarts the streak on a new day', () => {
    const next = progressReducer(
      base({ dailyXp: 40, streak: 4, longestStreak: 4, lastActiveDate: '2000-01-01' }),
      { type: 'complete-lesson', lessonId: 'u2-l1', xp: 10, perfect: false },
    );
    expect(next.dailyXp).toBe(10);
    expect(next.streak).toBe(1);
    expect(next.longestStreak).toBe(4);
  });
});

describe('progressReducer / gems', () => {
  it('buy-gems adds the pack amount', () => {
    const next = progressReducer(base({ gems: 100 }), { type: 'buy-gems', amount: 500 });
    expect(next.gems).toBe(600);
    expect(next.version).toBe(1);
  });
});

describe('progressReducer / profile & settings', () => {
  it('set-goal updates dailyGoal', () => {
    expect(progressReducer(base(), { type: 'set-goal', goal: 80 }).dailyGoal).toBe(80);
  });

  it('set-username falls back to "Học viên" for an empty name', () => {
    expect(progressReducer(base(), { type: 'set-username', username: '' }).username).toBe(
      'Học viên',
    );
  });

  it('set-username truncates to 20 characters', () => {
    const long = 'a'.repeat(30);
    expect(progressReducer(base(), { type: 'set-username', username: long }).username).toHaveLength(
      20,
    );
  });

  it('set-username keeps a normal name', () => {
    expect(progressReducer(base(), { type: 'set-username', username: 'Sakura' }).username).toBe(
      'Sakura',
    );
  });

  it('toggle-setting flips only the requested key', () => {
    const next = progressReducer(base(), { type: 'toggle-setting', key: 'soundOn' });
    expect(next.settings.soundOn).toBe(false);
    expect(next.settings.speechOn).toBe(true);

    const next2 = progressReducer(base(), { type: 'toggle-setting', key: 'speechOn' });
    expect(next2.settings.speechOn).toBe(false);
    expect(next2.settings.soundOn).toBe(true);
  });

  it('reset restores defaults but keeps the version counter moving', () => {
    const start = base({ xp: 999, version: 12 });
    const next = progressReducer(start, { type: 'reset' });
    expect(next.xp).toBe(DEFAULT_STATE.xp);
    expect(next.version).toBe(13);
  });
});

describe('loadState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns DEFAULT_STATE when storage is empty', () => {
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it('returns DEFAULT_STATE when the JSON is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it('returns DEFAULT_STATE when the stored value is not an object', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('hello'));
    expect(loadState()).toEqual(DEFAULT_STATE);
  });

  it('merges a partial stored state over the defaults', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ xp: 42, settings: { soundOn: false }, completedLessons: ['u1-l1'] }),
    );
    const state = loadState();
    expect(state.xp).toBe(42);
    expect(state.username).toBe(DEFAULT_STATE.username);
    expect(state.settings).toEqual({ soundOn: false, speechOn: true });
    expect(state.completedLessons).toEqual(['u1-l1']);
  });

  it('repairs a non-array completedLessons value', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedLessons: 'oops' }));
    expect(loadState().completedLessons).toEqual([]);
  });
});
