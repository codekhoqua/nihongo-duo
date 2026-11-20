import { useEffect, useRef, useState } from 'react';
import type { TypingExercise } from '../../../types';
import { readingHint } from '../lessonEngine';
import KanaPad from './KanaPad';

interface Props {
  exercise: TypingExercise;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  /** Unit 1–2 learners get the kana pad open and the reading hint by default. */
  beginner?: boolean;
}

/**
 * Answer input shared by `typing` and `listen-typing`.
 *
 * A learner who has never typed Japanese has no IME and no idea what to press,
 * so the field always explains that romaji is accepted and offers an in-app
 * hiragana keyboard (the same idea as Duolingo's kana keyboard + romaji toggle).
 */
export default function TypingField({
  exercise,
  value,
  disabled,
  onChange,
  beginner = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [padOpen, setPadOpen] = useState(beginner);
  const [hintOpen, setHintOpen] = useState(false);

  const reading = readingHint(exercise);
  const hasReading = /[a-z]/i.test(reading);

  useEffect(() => {
    setPadOpen(beginner);
    setHintOpen(false);
  }, [exercise.id, beginner]);

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    const timer = window.setTimeout(() => node.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [exercise.id]);

  /** Insert at the caret so typing and tapping can be mixed. */
  const insert = (char: string) => {
    const node = inputRef.current;
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + char + value.slice(end));
    const caret = start + char.length;
    window.setTimeout(() => {
      const field = inputRef.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(caret, caret);
    }, 0);
  };

  const backspace = () => {
    const node = inputRef.current;
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? value.length;
    const from = start === end ? Math.max(0, start - 1) : start;
    onChange(value.slice(0, from) + value.slice(end));
    window.setTimeout(() => {
      const field = inputRef.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(from, from);
    }, 0);
  };

  return (
    <div className="typing-field">
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
        aria-label="Câu trả lời"
        aria-describedby="typing-helper"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        data-testid="typing-input"
      />

      <p id="typing-helper" className="typing-helper">
        Chưa có bàn phím tiếng Nhật? Gõ <strong>romaji</strong> cũng được (vd: ohayou) hoặc bấm
        bảng kana bên dưới.
      </p>

      {hintOpen && (
        <p className="typing-hint" data-testid="reading-hint">
          Cách đọc: <strong>{reading}</strong>
        </p>
      )}

      <div className="typing-tools">
        <button
          type="button"
          className="kana-toggle"
          aria-expanded={padOpen}
          aria-controls="kana-pad"
          onClick={() => setPadOpen((open) => !open)}
          disabled={disabled}
          data-testid="kana-toggle"
        >
          ⌨ {padOpen ? 'Ẩn bảng kana' : 'Bảng kana'}
        </button>

        {hasReading && (
          <button
            type="button"
            className="kana-toggle"
            aria-expanded={hintOpen}
            onClick={() => setHintOpen((open) => !open)}
            disabled={disabled}
            data-testid="reading-hint-toggle"
          >
            💡 {hintOpen ? 'Ẩn gợi ý' : 'Gợi ý cách đọc'}
          </button>
        )}
      </div>

      {padOpen && (
        <div id="kana-pad">
          <KanaPad onInsert={insert} onBackspace={backspace} disabled={disabled} />
        </div>
      )}
    </div>
  );
}

