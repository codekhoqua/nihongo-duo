import type { TypingExercise } from '../../../types';
import type { SpeakHandler } from './types';
import TypingField from './TypingField';

interface Props {
  exercise: TypingExercise;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSpeak: SpeakHandler;
  beginner?: boolean;
}

/** Audio only → type what you hear. */
export default function ListenTyping({
  exercise,
  value,
  disabled,
  onChange,
  onSpeak,
  beginner,
}: Props) {
  const audio = exercise.audioText ?? exercise.japanese ?? '';

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
        <p className="listen-hint">Nghe và viết lại (romaji cũng được)</p>
      </div>

      <TypingField
        exercise={exercise}
        value={value}
        disabled={disabled}
        onChange={onChange}
        beginner={beginner}
      />
    </div>
  );
}
