/**
 * Tiny builders used by every lesson.
 *
 * Going through these helpers keeps the content consistent by construction:
 * choice ids are always a/b/c/d, `answerId` always points at a real choice,
 * word-bank tokens are always a shuffled multiset of the answer + distractors.
 */
import type {
  Choice,
  ChoiceExercise,
  ImageExercise,
  MatchExercise,
  PairItem,
  TypingExercise,
  WordBankExercise,
} from '../types';

/** Vietnamese prompts shared by the lessons. */
export const PROMPT = {
  meaning: 'Chọn nghĩa đúng',
  reading: 'Chọn cách đọc đúng',
  translate: 'Dịch câu này',
  listen: 'Nghe và viết lại',
  match: 'Ghép cặp',
  fill: 'Điền vào chỗ trống',
  image: 'Chọn hình đúng',
} as const;

const CHOICE_IDS = ['a', 'b', 'c', 'd'] as const;

let seed = 20240517;

function random(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

/** Deterministic Fisher-Yates so the content is stable between builds. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function withChoices(correct: string, wrong: readonly string[]): { choices: Choice[]; answerId: string } {
  const labels = shuffle([correct, ...wrong]);
  const choices: Choice[] = labels.map((label, index) => ({ id: CHOICE_IDS[index], label }));
  const answerId = choices[labels.indexOf(correct)].id;
  return { choices, answerId };
}

interface ChoiceArgs {
  id: string;
  japanese: string;
  reading?: string;
  audioText?: string;
  prompt?: string;
  correct: string;
  wrong: readonly string[];
  explanation?: string;
}

export function translateChoice(args: ChoiceArgs): ChoiceExercise {
  const { choices, answerId } = withChoices(args.correct, args.wrong);
  return {
    id: args.id,
    kind: 'translate-choice',
    prompt: args.prompt ?? PROMPT.meaning,
    japanese: args.japanese,
    reading: args.reading,
    audioText: args.audioText ?? args.japanese,
    choices,
    answerId,
    explanation: args.explanation,
  };
}

interface FillArgs {
  id: string;
  sentence: string;
  text?: string;
  audioText?: string;
  correct: string;
  wrong: readonly string[];
  explanation?: string;
}

export function fillBlank(args: FillArgs): ChoiceExercise {
  const { choices, answerId } = withChoices(args.correct, args.wrong);
  return {
    id: args.id,
    kind: 'fill-blank',
    prompt: PROMPT.fill,
    sentence: args.sentence,
    text: args.text,
    audioText: args.audioText ?? args.sentence.replace('___', args.correct),
    choices,
    answerId,
    explanation: args.explanation,
  };
}

interface ImageArgs {
  id: string;
  japanese: string;
  reading?: string;
  audioText?: string;
  answer: { emoji: string; label: string };
  wrong: ReadonlyArray<{ emoji: string; label: string }>;
  explanation?: string;
}

export function selectImage(args: ImageArgs): ImageExercise {
  const options = shuffle([args.answer, ...args.wrong]);
  const choices: Choice[] = options.map((option, index) => ({
    id: CHOICE_IDS[index],
    label: option.label,
    emoji: option.emoji,
  }));
  const answerId = choices[options.indexOf(args.answer)].id;
  return {
    id: args.id,
    kind: 'select-image',
    prompt: PROMPT.image,
    japanese: args.japanese,
    reading: args.reading,
    audioText: args.audioText ?? args.japanese,
    choices,
    answerId,
    explanation: args.explanation,
  };
}

interface WordBankArgs {
  id: string;
  /** Vietnamese sentence shown as the question. */
  text: string;
  answerTokens: readonly string[];
  distractors: readonly string[];
  audioText?: string;
  explanation?: string;
}

export function wordBank(args: WordBankArgs): WordBankExercise {
  let tokens = shuffle([...args.answerTokens, ...args.distractors]);
  const startsWithAnswer = args.answerTokens.every((token, index) => tokens[index] === token);
  if (startsWithAnswer) tokens = tokens.reverse();
  return {
    id: args.id,
    kind: 'word-bank',
    prompt: PROMPT.translate,
    text: args.text,
    tokens,
    answerTokens: [...args.answerTokens],
    audioText: args.audioText ?? args.answerTokens.join(''),
    explanation: args.explanation,
  };
}

interface TypingArgs {
  id: string;
  kind?: 'typing' | 'listen-typing';
  text?: string;
  audioText?: string;
  accepted: readonly string[];
  answerLabel: string;
  explanation?: string;
}

export function typing(args: TypingArgs): TypingExercise {
  const kind = args.kind ?? 'typing';
  return {
    id: args.id,
    kind,
    prompt: kind === 'listen-typing' ? PROMPT.listen : PROMPT.translate,
    text: args.text,
    audioText: args.audioText ?? args.answerLabel,
    accepted: [...args.accepted],
    answerLabel: args.answerLabel,
    explanation: args.explanation,
  };
}

interface MatchArgs {
  id: string;
  pairs: ReadonlyArray<readonly [string, string]>;
  explanation?: string;
}

export function matchPairs(args: MatchArgs): MatchExercise {
  const pairs: PairItem[] = args.pairs.map(([left, right], index) => ({
    id: `p${index + 1}`,
    left,
    right,
  }));
  return {
    id: args.id,
    kind: 'match-pairs',
    prompt: PROMPT.match,
    pairs,
    explanation: args.explanation,
  };
}
