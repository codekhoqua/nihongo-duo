import type { WordBankExercise } from '../../../types';
import type { SpeakHandler } from './types';

interface Props {
  exercise: WordBankExercise;
  /** Indices into `exercise.tokens`, in the order the user tapped them. */
  selected: number[];
  disabled: boolean;
  onToggle: (index: number) => void;
  onSpeak: SpeakHandler;
}

/** Build the Japanese sentence by tapping tokens. */
export default function WordBank({ exercise, selected, disabled, onToggle, onSpeak }: Props) {
  const audio = exercise.audioText;

  return (
    <div className="ex ex--bank">
      <div className="ex__question">
        <div className="ex__sentence jp">{exercise.text}</div>
        {audio && (
          <button
            type="button"
            className="ex__speaker"
            aria-label="Nghe câu mẫu"
            onClick={() => onSpeak(audio)}
            disabled={disabled}
          >
            🔊
          </button>
        )}
      </div>

      <div className="bank-answer" data-testid="bank-answer">
        {selected.length === 0 ? (
          <span className="bank-answer__hint">Chạm vào từ bên dưới để xếp câu…</span>
        ) : (
          selected.map((tokenIndex, position) => {
            const token = exercise.tokens[tokenIndex];
            if (token === undefined) return null;
            return (
              <button
                key={`${tokenIndex}-${position}`}
                type="button"
                className="token token--placed jp"
                onClick={() => onToggle(tokenIndex)}
                disabled={disabled}
                aria-label={`Bỏ từ ${token}`}
              >
                {token}
              </button>
            );
          })
        )}
      </div>

      <div className="bank-pool">
        {exercise.tokens.map((token, index) => {
          const used = selected.includes(index);
          return (
            <button
              key={`${token}-${index}`}
              type="button"
              className={`token${used ? ' token--used' : ''}`}
              onClick={() => onToggle(index)}
              disabled={disabled || used}
              aria-hidden={used}
              tabIndex={used ? -1 : 0}
              data-testid={`token-${index}`}
            >
              <span className="jp">{token}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
