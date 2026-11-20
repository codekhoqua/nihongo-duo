import { useEffect, useRef } from 'react';
import type { TypingExercise } from '../../../types';
import type { SpeakHandler } from './types';

interface Props {
  exercise: TypingExercise;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSpeak: SpeakHandler;
}

/** Audio only → type what you hear. */
export default function ListenTyping({ exercise, value, disabled, onChange, onSpeak }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const audio = exercise.audioText ?? exercise.japanese ?? '';

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    const timer = window.setTimeout(() => node.focus(), 320);
    return () => window.clearTimeout(timer);
  }, [exercise.id]);

  return (
    <div className="ex ex--listen">
      <div className="listen-area">
        <button
          type="button"
          className="listen-btn"
          aria-label="Nghe lại"
          onClick={() => onSpeak(audio)}
          disabled={disabled}
          data-testid="listen-button"
        >
          🔊
        </button>
        <p className="listen-hint">Nghe và viết lại bằng tiếng Nhật</p>
      </div>

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
