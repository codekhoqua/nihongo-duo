import { useEffect, useMemo, useRef, useState } from 'react';
import type { MatchExercise, PairItem } from '../../../types';
import { shuffle } from '../lessonEngine';
import type { SpeakHandler } from './types';

interface Props {
  exercise: MatchExercise;
  disabled: boolean;
  /** Every pair has been matched. */
  onComplete: () => void;
  /** A wrong pair was tapped (the screen decides whether to charge a heart). */
  onMistake: () => void;
  onSpeak: SpeakHandler;
}

function seedFrom(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/** Tap a Japanese card then its Vietnamese partner. */
export default function MatchPairs({ exercise, disabled, onComplete, onMistake, onSpeak }: Props) {
  const rightOrder = useMemo(() => shuffle<PairItem>(exercise.pairs, seedFrom(exercise.id)), [exercise]);
  const [matched, setMatched] = useState<string[]>([]);
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [rightSel, setRightSel] = useState<string | null>(null);
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const evaluate = (left: string, right: string) => {
    if (left === right) {
      const next = [...matched, left];
      setMatched(next);
      setLeftSel(null);
      setRightSel(null);
      if (next.length === exercise.pairs.length) onComplete();
      return;
    }
    setWrong({ left, right });
    onMistake();
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setWrong(null);
      setLeftSel(null);
      setRightSel(null);
    }, 560);
  };

  const pickLeft = (item: PairItem) => {
    if (disabled || wrong || matched.includes(item.id)) return;
    onSpeak(item.left);
    if (leftSel === item.id) {
      setLeftSel(null);
      return;
    }
    setLeftSel(item.id);
    if (rightSel) evaluate(item.id, rightSel);
  };

  const pickRight = (item: PairItem) => {
    if (disabled || wrong || matched.includes(item.id)) return;
    if (rightSel === item.id) {
      setRightSel(null);
      return;
    }
    setRightSel(item.id);
    if (leftSel) evaluate(leftSel, item.id);
  };

  const stateOf = (id: string, selected: boolean): string => {
    if (matched.includes(id)) return ' match-card--matched';
    if (wrong && (wrong.left === id || wrong.right === id)) return ' match-card--wrong';
    return selected ? ' match-card--selected' : '';
  };

  return (
    <div className="ex ex--match">
      <div className="match-grid">
        <div className="match-col" role="group" aria-label="Tiếng Nhật">
          {exercise.pairs.map((pair) => (
            <button
              key={`l-${pair.id}`}
              type="button"
              className={`match-card match-card--jp jp${stateOf(pair.id, leftSel === pair.id)}`}
              onClick={() => pickLeft(pair)}
              disabled={disabled || matched.includes(pair.id)}
              aria-pressed={leftSel === pair.id}
            >
              {pair.left}
            </button>
          ))}
        </div>
        <div className="match-col" role="group" aria-label="Tiếng Việt">
          {rightOrder.map((pair) => (
            <button
              key={`r-${pair.id}`}
              type="button"
              className={`match-card${stateOf(pair.id, rightSel === pair.id)}`}
              onClick={() => pickRight(pair)}
              disabled={disabled || matched.includes(pair.id)}
              aria-pressed={rightSel === pair.id}
            >
              {pair.right}
            </button>
          ))}
        </div>
      </div>
      <p className="match-progress muted">
        Đã ghép {matched.length}/{exercise.pairs.length} cặp
      </p>
    </div>
  );
}
