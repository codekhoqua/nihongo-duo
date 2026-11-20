import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ProgressAction, ProgressState } from './types';
import { daysBetween, todayISO } from './lib/date';

export const STORAGE_KEY = 'nihongo-duo:progress:v1';

export const DEFAULT_STATE: ProgressState = {
  username: 'Học viên',
  avatar: '🦊',
  hearts: 5,
  maxHearts: 5,
  gems: 500,
  xp: 0,
  streak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  dailyXp: 0,
  dailyGoal: 50,
  crowns: {},
  completedLessons: [],
  perfectLessons: 0,
  totalAnswers: 0,
  correctAnswers: 0,
  settings: { soundOn: true, speechOn: true },
  version: 0,
};

/** Registers a new active day and returns the updated streak fields. */
function touchDay(state: ProgressState): Pick<ProgressState, 'streak' | 'longestStreak' | 'lastActiveDate' | 'dailyXp'> {
  const today = todayISO();
  if (state.lastActiveDate === today) {
    return {
      streak: state.streak,
      longestStreak: state.longestStreak,
      lastActiveDate: today,
      dailyXp: state.dailyXp,
    };
  }
  const gap = state.lastActiveDate ? daysBetween(state.lastActiveDate, today) : null;
  const streak = gap === 1 ? state.streak + 1 : 1;
  return {
    streak,
    longestStreak: Math.max(state.longestStreak, streak),
    lastActiveDate: today,
    dailyXp: 0,
  };
}

export function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'hydrate':
      return { ...action.state, version: state.version + 1 };

    case 'answer': {
      const total = state.totalAnswers + 1;
      const correct = state.correctAnswers + (action.correct ? 1 : 0);
      return { ...state, totalAnswers: total, correctAnswers: correct, version: state.version + 1 };
    }

    case 'lose-heart':
      return { ...state, hearts: Math.max(0, state.hearts - 1), version: state.version + 1 };

    case 'refill-hearts': {
      const cost = action.cost ?? 350;
      if (state.gems < cost || state.hearts >= state.maxHearts) return state;
      return {
        ...state,
        hearts: state.maxHearts,
        gems: state.gems - cost,
        version: state.version + 1,
      };
    }

    case 'buy-gems':
      return { ...state, gems: state.gems + action.amount, version: state.version + 1 };

    case 'complete-lesson': {
      const day = touchDay(state);
      const prevCrown = state.crowns[action.lessonId] ?? 0;
      const crowns = { ...state.crowns, [action.lessonId]: Math.min(5, prevCrown + 1) };
      const completedLessons = state.completedLessons.includes(action.lessonId)
        ? state.completedLessons
        : [...state.completedLessons, action.lessonId];
      return {
        ...state,
        ...day,
        crowns,
        completedLessons,
        xp: state.xp + action.xp,
        dailyXp: day.dailyXp + action.xp,
        gems: state.gems + (action.perfect ? 8 : 3),
        perfectLessons: state.perfectLessons + (action.perfect ? 1 : 0),
        version: state.version + 1,
      };
    }

    case 'set-goal':
      return { ...state, dailyGoal: action.goal, version: state.version + 1 };

    case 'set-username':
      return { ...state, username: action.username.slice(0, 20) || 'Học viên', version: state.version + 1 };

    case 'toggle-setting':
      return {
        ...state,
        settings: { ...state.settings, [action.key]: !state.settings[action.key] },
        version: state.version + 1,
      };

    case 'reset':
      return { ...DEFAULT_STATE, version: state.version + 1 };

    default:
      return state;
  }
}

export function loadState(): ProgressState {
  if (typeof localStorage === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_STATE;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings ?? {}) },
      crowns: { ...(parsed.crowns ?? {}) },
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export interface ProgressContextValue {
  state: ProgressState;
  dispatch: React.Dispatch<ProgressAction>;
  /** Percentage 0..100 of the daily goal. */
  dailyPercent: number;
  /** Accuracy 0..100 over all answers (0 when none). */
  accuracy: number;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(progressReducer, undefined, loadState);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: 0 }));
    } catch {
      /* storage full / disabled — progress stays in memory */
    }
  }, [state]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      state,
      dispatch,
      dailyPercent: Math.min(100, Math.round((state.dailyXp / Math.max(1, state.dailyGoal)) * 100)),
      accuracy: state.totalAnswers ? Math.round((state.correctAnswers / state.totalAnswers) * 100) : 0,
    }),
    [state],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}

/** Convenience helper: is a lesson playable right now? */
export function isLessonUnlocked(state: ProgressState, lessonIds: string[], lessonId: string): boolean {
  const index = lessonIds.indexOf(lessonId);
  if (index <= 0) return true;
  return state.completedLessons.includes(lessonIds[index - 1]);
}

/** Daily quest progress derived from the store (no extra persistence). */
export function useDailyQuests() {
  const { state } = useProgress();
  return useMemo(
    () => [
      { id: 'xp', icon: '⚡', label: `Kiếm ${state.dailyGoal} XP`, value: state.dailyXp, goal: state.dailyGoal },
      { id: 'lessons', icon: '📘', label: 'Hoàn thành 2 bài học', value: Math.min(2, state.completedLessons.length), goal: 2 },
      { id: 'accuracy', icon: '🎯', label: 'Đạt 80% chính xác', value: state.totalAnswers ? Math.min(80, Math.round((state.correctAnswers / state.totalAnswers) * 100)) : 0, goal: 80 },
    ],
    [state],
  );
}

/** Tiny helper for screens that need a "restart" button. */
export function useReset() {
  const { dispatch } = useProgress();
  return useCallback(() => {
    if (typeof window !== 'undefined' && window.confirm('Xoá toàn bộ tiến độ học?')) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      dispatch({ type: 'reset' });
    }
  }, [dispatch]);
}
