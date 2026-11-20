import type { ChoiceViewProps, SpeakHandler } from './types';

interface Props extends ChoiceViewProps {
  onSpeak: SpeakHandler;
}

/** Japanese → pick the matching picture tile. */
export default function SelectImage({ exercise, selectedId, disabled, onSelect, onSpeak }: Props) {
  const audio = exercise.audioText;

  return (
    <div className="ex ex--image">
      {exercise.japanese && (
        <div className="ex__question">
          <div className="ex__japanese jp">{exercise.japanese}</div>
          {exercise.reading && <div className="ex__reading">{exercise.reading}</div>}
          {audio && (
            <button
              type="button"
              className="ex__speaker"
              aria-label="Nghe phát âm"
              onClick={() => onSpeak(audio)}
              disabled={disabled}
            >
              🔊
            </button>
          )}
        </div>
      )}

      <div className="image-grid">
        {exercise.choices.map((choice, index) => {
          const selected = selectedId === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              className={`image-tile${selected ? ' image-tile--selected' : ''}`}
              aria-pressed={selected}
              aria-label={choice.label}
              onClick={() => onSelect(choice.id)}
              disabled={disabled}
              data-testid={`image-${choice.id}`}
            >
              <span className="image-tile__emoji" aria-hidden="true">
                {choice.emoji ?? '🖼️'}
              </span>
              <span className="image-tile__label">{choice.label}</span>
              <span className="choice-card__key" aria-hidden="true">
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
