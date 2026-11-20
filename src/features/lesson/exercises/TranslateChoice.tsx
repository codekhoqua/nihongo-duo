import type { ChoiceViewProps, SpeakHandler } from './types';

interface Props extends ChoiceViewProps {
  onSpeak: SpeakHandler;
}

/** Japanese → pick the correct Vietnamese meaning. */
export default function TranslateChoice({ exercise, selectedId, disabled, onSelect, onSpeak }: Props) {
  const audio = exercise.audioText;

  return (
    <div className="ex ex--choice">
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

      <div className="choice-list">
        {exercise.choices.map((choice, index) => {
          const selected = selectedId === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              className={`choice-card${selected ? ' choice-card--selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelect(choice.id)}
              disabled={disabled}
              data-testid={`choice-${choice.id}`}
            >
              <span className="choice-card__key" aria-hidden="true">
                {index + 1}
              </span>
              <span className="choice-card__label">{choice.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
