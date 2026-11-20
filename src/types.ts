/**
 * Domain contract for Nihongo Duo.
 * Any code (content, exercise engine, screens) must conform to these types.
 */

/* ------------------------------------------------------------------ */
/* Vocabulary & kana                                                   */
/* ------------------------------------------------------------------ */

export interface Word {
  id: string;
  /** Japanese in kana (hiragana or katakana). */
  kana: string;
  /** Kanji form when it differs from kana. */
  kanji?: string;
  /** Hepburn romaji, no macrons. */
  romaji: string;
  /** Vietnamese meaning, short (max ~24 chars). */
  meaning: string;
  /** Emoji acting as a picture hint. */
  emoji?: string;
  /** Optional short Vietnamese usage hint. */
  note?: string;
}

export interface KanaChar {
  id: string;
  char: string;
  romaji: string;
  /** Row label, e.g. "a", "ka", "sa". */
  row: string;
  /** Example word using the kana. */
  example?: string;
  exampleMeaning?: string;
}

export type KanaScript = 'hiragana' | 'katakana';

/* ------------------------------------------------------------------ */
/* Exercises                                                           */
/* ------------------------------------------------------------------ */

export type ExerciseKind =
  | 'translate-choice' // Japanese -> pick Vietnamese meaning
  | 'select-image' // Japanese -> pick the emoji / picture tile
  | 'word-bank' // build the Japanese sentence from tokens
  | 'typing' // type the answer (kana or romaji accepted)
  | 'listen-typing' // audio only -> type what you hear
  | 'match-pairs' // tap pairs, 4 per round
  | 'fill-blank'; // sentence with ___ , pick the particle/word

export interface Choice {
  id: string;
  label: string;
  /** Big emoji tile instead of text (select-image). */
  emoji?: string;
  audioText?: string;
}

export interface PairItem {
  id: string;
  left: string;
  right: string;
}

export interface ExerciseBase {
  id: string;
  kind: ExerciseKind;
  /** Instruction shown at the top, e.g. "Chọn nghĩa đúng". */
  prompt: string;
  /** Japanese shown as the main question (already styled). */
  japanese?: string;
  /** Romaji/reading hint shown under the Japanese. */
  reading?: string;
  /** Big Vietnamese/instruction text for non-Japanese questions. */
  text?: string;
  /** Sentence with `___` placeholder (fill-blank). */
  sentence?: string;
  /** Text spoken by the TTS button / auto played. */
  audioText?: string;
  explanation?: string;
}

export interface ChoiceExercise extends ExerciseBase {
  kind: 'translate-choice' | 'fill-blank';
  choices: Choice[];
  /** Choice id that is correct. */
  answerId: string;
}

export interface ImageExercise extends ExerciseBase {
  kind: 'select-image';
  choices: Choice[];
  answerId: string;
}

export interface WordBankExercise extends ExerciseBase {
  kind: 'word-bank';
  /** Shuffled tokens offered to the user. */
  tokens: string[];
  /** Correct token order. Joined with '' for Japanese. */
  answerTokens: string[];
  /** Vietnamese translation shown as the question. */
  text: string;
}

export interface TypingExercise extends ExerciseBase {
  kind: 'typing' | 'listen-typing';
  /** Accepted answers (kana and/or romaji and/or kanji). */
  accepted: string[];
  /** Shown after answering; friendly reference answer. */
  answerLabel: string;
}

export interface MatchExercise extends ExerciseBase {
  kind: 'match-pairs';
  pairs: PairItem[];
}

export type Exercise =
  | ChoiceExercise
  | ImageExercise
  | WordBankExercise
  | TypingExercise
  | MatchExercise;

/* ------------------------------------------------------------------ */
/* Course structure                                                    */
/* ------------------------------------------------------------------ */

export type LessonIcon =
  | 'star'
  | 'book'
  | 'chat'
  | 'mic'
  | 'trophy'
  | 'chest'
  | 'dumbbell'
  | 'story';

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  subtitle: string;
  icon: LessonIcon;
  exercises: Exercise[];
  /** XP granted on completion (defaults to 10). */
  xp?: number;
  /** Short Vietnamese teaching note shown on the intro card. */
  tip?: string;
}

export interface Unit {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  /** Accent colour used for the unit banner. */
  color: string;
  lessons: Lesson[];
}

/* ------------------------------------------------------------------ */
/* Progress / gamification                                             */
/* ------------------------------------------------------------------ */

export interface Settings {
  soundOn: boolean;
  speechOn: boolean;
}

export interface ProgressState {
  username: string;
  avatar: string;
  gems: number;
  xp: number;
  /** Consecutive days with at least one lesson. */
  streak: number;
  /** Best streak ever achieved. */
  longestStreak: number;
  /** ISO date (YYYY-MM-DD) of the last lesson day. */
  lastActiveDate: string | null;
  dailyXp: number;
  dailyGoal: number;
  /** lessonId -> crowns (0-5). */
  crowns: Record<string, number>;
  completedLessons: string[];
  perfectLessons: number;
  totalAnswers: number;
  correctAnswers: number;
  settings: Settings;
  /** Bumped so React can re-render on any change. */
  version: number;
}

export type ProgressAction =
  | { type: 'answer'; correct: boolean }
  | { type: 'buy-gems'; amount: number }
  | { type: 'complete-lesson'; lessonId: string; xp: number; perfect: boolean }
  | { type: 'set-goal'; goal: number }
  | { type: 'set-username'; username: string }
  | { type: 'toggle-setting'; key: keyof Settings }
  | { type: 'reset' }
  | { type: 'hydrate'; state: ProgressState };

/* ------------------------------------------------------------------ */
/* Lesson runtime                                                      */
/* ------------------------------------------------------------------ */

export interface LessonResult {
  lessonId: string;
  xp: number;
  /** 0..100 accuracy. */
  accuracy: number;
  correct: number;
  total: number;
  perfect: boolean;
}
