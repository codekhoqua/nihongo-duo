import type { ChoiceExercise } from '../../../types';

interface Props {
  exercise: ChoiceExercise;
  selectedId: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}

/** Sentence with a `___` gap → pick the word that fills it. */
export default function FillBlank({ exercise, selectedId, disabled, onSelect }: Props) {
  const sentence = exercise.sentence ?? '';
  const parts = sentence.split('___');
  const picked = exercise.choices.find((choice) => choice.id === selectedId);

  return (
    <div className="ex ex--blank">
      <p className="blank-sentence jp">
        {parts.map((part, index) => (
          <span key={`part-${index}`}>
            {part}
            {index < parts.length - 1 && (
              <span className={`blank-slot${picked ? ' blank-slot--filled' : ''}`}>
                {picked ? picked.label : '\u00a0'}
              </span>
            )}
          </span>
        ))}
      </p>

      <div className="chip-row">
        {exercise.choices.map((choice) => {
          const selected = selectedId === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              className={`token token--chip${selected ? ' token--selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelect(choice.id)}
              disabled={disabled}
              data-testid={`blank-${choice.id}`}
            >
              <span className="jp">{choice.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
