import type { TypingExercise } from '../../../types';
import TypingField from './TypingField';

interface Props {
  exercise: TypingExercise;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  beginner?: boolean;
}

/** Type the answer in kana or romaji. */
export default function TypingInput({ exercise, value, disabled, onChange, beginner }: Props) {
  return (
    <div className="ex ex--typing">
      {exercise.text && <div className="ex__sentence">{exercise.text}</div>}
      {exercise.japanese && <div className="ex__japanese jp">{exercise.japanese}</div>}

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
