import { useEffect, useRef } from 'react';
import type { TypingExercise } from '../../../types';

interface Props {
  exercise: TypingExercise;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

/** Type the answer in kana or romaji. */
export default function TypingInput({ exercise, value, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    const timer = window.setTimeout(() => node.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [exercise.id]);

  return (
    <div className="ex ex--typing">
      {exercise.text && <div className="ex__sentence">{exercise.text}</div>}
      {exercise.japanese && <div className="ex__japanese jp">{exercise.japanese}</div>}

      <input
        ref={inputRef}
        className="typing-input jp"
        type="text"
        inputMode="text"
        lang="ja"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Nhập câu trả lời…"
        aria-label="Câu trả lời"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        data-testid="typing-input"
      />
    </div>
  );
}
