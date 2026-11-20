import type { ChoiceExercise, ImageExercise } from '../../../types';

/** Shared props for the two "pick one card" exercise views. */
export interface ChoiceViewProps {
  exercise: ChoiceExercise | ImageExercise;
  selectedId: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}

/** Called by views that can play audio; the screen owns the settings check. */
export type SpeakHandler = (text: string) => void;
