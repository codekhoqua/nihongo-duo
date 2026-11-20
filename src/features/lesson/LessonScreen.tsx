import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProgress } from '../../store';
import { getLesson } from '../../content';
import { playSfx } from '../../lib/sfx';
import { speak, stopSpeaking } from '../../lib/speech';
import type { Exercise } from '../../types';
import { gradeLesson, isTypingCorrect, isWordBankCorrect } from './lessonEngine';
import TranslateChoice from './exercises/TranslateChoice';
import SelectImage from './exercises/SelectImage';
import FillBlank from './exercises/FillBlank';
import WordBank from './exercises/WordBank';
import TypingInput from './exercises/TypingInput';
import ListenTyping from './exercises/ListenTyping';
import MatchPairs from './exercises/MatchPairs';
import './lesson.css';

type Phase = 'answering' | 'feedback' | 'result';

interface QueueItem {
  exercise: Exercise;
  /** 0 = first pass, 1 = the single retry slot at the end of the queue. */
  pass: 0 | 1;
}

interface Draft {
  choiceId: string | null;
  bank: number[];
  text: string;
}

interface Feedback {
  correct: boolean;
  answerLabel: string;
}

interface Result {
  xp: number;
  accuracy: number;
  correct: number;
  total: number;
  perfect: boolean;
}

const REFILL_COST = 350;

function evaluate(exercise: Exercise, draft: Draft): Feedback {
  switch (exercise.kind) {
    case 'translate-choice':
    case 'fill-blank':
    case 'select-image': {
      const answer = exercise.choices.find((choice) => choice.id === exercise.answerId);
      return { correct: draft.choiceId === exercise.answerId, answerLabel: answer?.label ?? '' };
    }
    case 'word-bank': {
      const picked = draft.bank.map((index) => exercise.tokens[index] ?? '');
      return {
        correct: isWordBankCorrect(picked, exercise.answerTokens),
        answerLabel: exercise.answerTokens.join(''),
      };
    }
    case 'typing':
    case 'listen-typing':
      return {
        correct: isTypingCorrect(draft.text, exercise.accepted),
        answerLabel: exercise.answerLabel,
      };
    case 'match-pairs':
      return {
        correct: true,
        answerLabel: exercise.pairs.map((pair) => `${pair.left} = ${pair.right}`).join(' · '),
      };
    default:
      return { correct: false, answerLabel: '' };
  }
}

function canCheck(exercise: Exercise | undefined, draft: Draft): boolean {
  if (!exercise) return false;
  switch (exercise.kind) {
    case 'word-bank':
      return draft.bank.length > 0;
    case 'typing':
    case 'listen-typing':
      return draft.text.trim().length > 0;
    case 'match-pairs':
      return false;
    default:
      return draft.choiceId !== null;
  }
}

export default function LessonScreen({ lessonId, onExit }: { lessonId: string; onExit: () => void }) {
  const { state, dispatch } = useProgress();
  const lesson = useMemo(() => getLesson(lessonId), [lessonId]);
  const exercises = lesson?.exercises;
  const total = exercises?.length ?? 0;
  const soundOn = state.settings.soundOn;
  const speechOn = state.settings.speechOn;

  const [queue, setQueue] = useState<QueueItem[]>(() =>
    (exercises ?? []).map((exercise) => ({ exercise, pass: 0 as const })),
  );
  const [cursor, setCursor] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [firstResults, setFirstResults] = useState<Record<string, boolean>>({});

  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [bank, setBank] = useState<number[]>([]);
  const [text, setText] = useState('');

  const [confirmExit, setConfirmExit] = useState(false);
  const [heartsModal, setHeartsModal] = useState(false);

  const completedRef = useRef(false);
  const penalizedMatch = useRef<Set<string>>(new Set());
  const heartsModalShown = useRef(false);

  const current = queue[cursor];
  const exercise = current?.exercise;
  const doneCount = Object.keys(firstResults).length;

  const resetDraft = useCallback(() => {
    setChoiceId(null);
    setBank([]);
    setText('');
  }, []);

  /* ------------------------------------------------------------ lifecycle */

  useEffect(() => {
    setQueue((exercises ?? []).map((item) => ({ exercise: item, pass: 0 as const })));
    setCursor(0);
    setPhase('answering');
    setFeedback(null);
    setResult(null);
    setFirstResults({});
    setChoiceId(null);
    setBank([]);
    setText('');
    completedRef.current = false;
    penalizedMatch.current = new Set();
    heartsModalShown.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(
    () => () => {
      stopSpeaking();
    },
    [],
  );

  /* Out of hearts, mid lesson. */
  useEffect(() => {
    if (state.hearts > 0) {
      heartsModalShown.current = false;
      return;
    }
    if (phase === 'result' || heartsModalShown.current) return;
    heartsModalShown.current = true;
    setHeartsModal(true);
  }, [state.hearts, phase]);

  /* Auto-play the listening exercise once per item. */
  useEffect(() => {
    if (!exercise || exercise.kind !== 'listen-typing') return;
    const audio = exercise.audioText ?? exercise.japanese ?? '';
    if (!audio) return;
    const timer = window.setTimeout(() => speak(audio, { enabled: speechOn }), 260);
    return () => window.clearTimeout(timer);
  }, [exercise, speechOn]);

  /* ----------------------------------------------------------------- api */

  const handleSpeak = useCallback(
    (value: string) => {
      speak(value, { enabled: speechOn });
    },
    [speechOn],
  );

  const finish = useCallback(() => {
    const correct = Object.values(firstResults).filter(Boolean).length;
    const grade = gradeLesson(correct, total, lesson?.xp ?? 10);
    setResult({ ...grade, correct, total });
    setFeedback(null);
    setPhase('result');
    playSfx('complete', soundOn);
    stopSpeaking();
  }, [firstResults, total, lesson, soundOn]);

  const handleCheck = useCallback(() => {
    if (!current || phase !== 'answering') return;
    const target = current.exercise;
    if (!canCheck(target, { choiceId, bank, text })) return;

    const verdict = evaluate(target, { choiceId, bank, text });
    setFeedback(verdict);
    setPhase('feedback');
    dispatch({ type: 'answer', correct: verdict.correct });
    setFirstResults((prev) =>
      prev[target.id] !== undefined ? prev : { ...prev, [target.id]: verdict.correct },
    );

    if (verdict.correct) {
      playSfx('correct', soundOn);
      return;
    }

    playSfx('wrong', soundOn);
    dispatch({ type: 'lose-heart' });
    if (current.pass === 0) {
      setQueue((prev) => [...prev, { exercise: target, pass: 1 }]);
    }
  }, [current, phase, choiceId, bank, text, dispatch, soundOn]);

  const handleContinue = useCallback(() => {
    if (phase !== 'feedback') return;
    if (cursor + 1 >= queue.length) {
      finish();
      return;
    }
    setFeedback(null);
    setPhase('answering');
    resetDraft();
    setCursor(cursor + 1);
  }, [phase, cursor, queue.length, finish, resetDraft]);

  const handleFinish = useCallback(() => {
    if (!result) return;
    if (!completedRef.current) {
      completedRef.current = true;
      dispatch({
        type: 'complete-lesson',
        lessonId,
        xp: result.xp,
        perfect: result.perfect,
      });
    }
    onExit();
  }, [result, dispatch, lessonId, onExit]);

  const handleExit = useCallback(() => {
    stopSpeaking();
    onExit();
  }, [onExit]);

  const handleMatchComplete = useCallback(() => {
    if (!current || phase !== 'answering') return;
    const target = current.exercise;
    const verdict = evaluate(target, { choiceId, bank, text });
    setFeedback(verdict);
    setPhase('feedback');
    dispatch({ type: 'answer', correct: true });
    playSfx('correct', soundOn);
    setFirstResults((prev) =>
      prev[target.id] !== undefined ? prev : { ...prev, [target.id]: true },
    );
  }, [current, phase, choiceId, bank, text, dispatch, soundOn]);

  const handleMatchMistake = useCallback(() => {
    if (!exercise) return;
    if (penalizedMatch.current.has(exercise.id)) return;
    penalizedMatch.current.add(exercise.id);
    dispatch({ type: 'answer', correct: false });
    dispatch({ type: 'lose-heart' });
    playSfx('wrong', soundOn);
  }, [exercise, dispatch, soundOn]);

  const toggleBank = useCallback(
    (index: number) => {
      setBank((prev) =>
        prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index],
      );
    },
    [],
  );

  const handleRefill = useCallback(() => {
    if (state.gems < REFILL_COST) return;
    dispatch({ type: 'refill-hearts' });
    setHeartsModal(false);
    heartsModalShown.current = false;
  }, [state.gems, dispatch]);

  /* ------------------------------------------------------------ keyboard */

  const checkable = canCheck(exercise, { choiceId, bank, text });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (confirmExit || heartsModal) return;
      const target = event.target as HTMLElement | null;
      const inField = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (event.key === 'Enter') {
        event.preventDefault();
        if (phase === 'result') handleFinish();
        else if (phase === 'feedback') handleContinue();
        else if (checkable) handleCheck();
        return;
      }

      if (inField || phase !== 'answering' || !exercise) return;
      const choices =
        exercise.kind === 'translate-choice' ||
        exercise.kind === 'fill-blank' ||
        exercise.kind === 'select-image'
          ? exercise.choices
          : null;
      if (!choices) return;
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0) return;
      const choice = choices[index];
      if (choice) setChoiceId(choice.id);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    confirmExit,
    heartsModal,
    phase,
    exercise,
    checkable,
    handleCheck,
    handleContinue,
    handleFinish,
  ]);

  /* Escape closes the top-most dialog. */
  useEffect(() => {
    if (!confirmExit && !heartsModal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirmExit) {
        setConfirmExit(false);
        return;
      }
      setHeartsModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmExit, heartsModal]);

  /* --------------------------------------------------------------- views */

  if (!lesson || total === 0) {
    return (
      <div className="lesson">
        <div className="lesson__missing">
          <p className="lesson__missing-emoji" aria-hidden="true">
            🤔
          </p>
          <p className="h3">Bài học này chưa có nội dung.</p>
          <button type="button" className="btn btn--primary" onClick={handleExit}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div className="lesson lesson--result">
        <div className="result" data-testid="lesson-result">
          <p className="result__emoji" aria-hidden="true">
            🎉
          </p>
          <h1 className="result__title">Hoàn thành bài học!</h1>
          <p className="result__subtitle">{lesson.title}</p>
          <p className="result__xp">+{result.xp} XP</p>
          <div className="result__stats">
            <div className="result__stat">
              <span className="result__stat-value">{result.accuracy}%</span>
              <span className="result__stat-label">Chính xác</span>
            </div>
            <div className="result__stat">
              <span className="result__stat-value">
                {result.correct}/{result.total}
              </span>
              <span className="result__stat-label">Câu đúng</span>
            </div>
            <div className="result__stat">
              <span className="result__stat-value">🔥 {state.streak}</span>
              <span className="result__stat-label">Chuỗi ngày</span>
            </div>
          </div>
          {result.perfect && <p className="pill pill--yellow">Hoàn hảo! +5 XP thưởng</p>}
          <button
            type="button"
            className="btn btn--primary btn--lg btn--block"
            onClick={handleFinish}
            data-testid="result-continue"
          >
            TIẾP TỤC
          </button>
        </div>
      </div>
    );
  }

  const isMatch = exercise?.kind === 'match-pairs';
  const footerVisible = phase === 'feedback' || !isMatch;

  return (
    <div className="lesson">
      <header className="lesson__top">
        <button
          type="button"
          className="lesson__close"
          onClick={() => setConfirmExit(true)}
          aria-label="Thoát bài học"
          data-testid="lesson-close"
        >
          ✕
        </button>
        <div
          className="progress lesson__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          aria-label="Tiến độ bài học"
        >
          <div
            className="progress__fill"
            style={{ width: `${Math.min(100, Math.round((doneCount / Math.max(1, total)) * 100))}%` }}
          />
        </div>
        <span className="lesson__hearts" title="Mạng còn lại" aria-label={`Còn ${state.hearts} mạng`}>
          <span aria-hidden="true">❤️</span>
          {state.hearts}
        </span>
      </header>

      <div className="lesson__scroll">
        <div className="lesson__inner">
          <h1 className="lesson__prompt">{exercise?.prompt ?? ''}</h1>

          {exercise && (
            <div className="lesson__body" key={`${exercise.id}-${current?.pass ?? 0}`}>
              {(exercise.kind === 'translate-choice' || exercise.kind === 'select-image') && (
                <>
                  {exercise.kind === 'translate-choice' ? (
                    <TranslateChoice
                      exercise={exercise}
                      selectedId={choiceId}
                      disabled={phase !== 'answering'}
                      onSelect={setChoiceId}
                      onSpeak={handleSpeak}
                    />
                  ) : (
                    <SelectImage
                      exercise={exercise}
                      selectedId={choiceId}
                      disabled={phase !== 'answering'}
                      onSelect={setChoiceId}
                      onSpeak={handleSpeak}
                    />
                  )}
                </>
              )}

              {exercise.kind === 'fill-blank' && (
                <FillBlank
                  exercise={exercise}
                  selectedId={choiceId}
                  disabled={phase !== 'answering'}
                  onSelect={setChoiceId}
                />
              )}

              {exercise.kind === 'word-bank' && (
                <WordBank
                  exercise={exercise}
                  selected={bank}
                  disabled={phase !== 'answering'}
                  onToggle={toggleBank}
                  onSpeak={handleSpeak}
                />
              )}

              {exercise.kind === 'typing' && (
                <TypingInput
                  exercise={exercise}
                  value={text}
                  disabled={phase !== 'answering'}
                  onChange={setText}
                />
              )}

              {exercise.kind === 'listen-typing' && (
                <ListenTyping
                  exercise={exercise}
                  value={text}
                  disabled={phase !== 'answering'}
                  onChange={setText}
                  onSpeak={handleSpeak}
                />
              )}

              {exercise.kind === 'match-pairs' && (
                <MatchPairs
                  exercise={exercise}
                  disabled={phase !== 'answering'}
                  onComplete={handleMatchComplete}
                  onMistake={handleMatchMistake}
                  onSpeak={handleSpeak}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {footerVisible && (
        <footer
          className={`lesson__footer${
            phase === 'feedback' && feedback
              ? feedback.correct
                ? ' lesson__footer--ok'
                : ' lesson__footer--bad'
              : ''
          }`}
        >
          <div className="lesson__footer-inner">
            {phase === 'feedback' && feedback ? (
              <div className="verdict" role="status" data-testid="verdict">
                <p className="verdict__title">
                  {feedback.correct ? '✅ Chính xác!' : '❌ Sai rồi'}
                </p>
                {!feedback.correct && (
                  <p className="verdict__answer">
                    Đáp án đúng: <strong className="jp">{feedback.answerLabel}</strong>
                  </p>
                )}
                {exercise?.explanation && <p className="verdict__note">{exercise.explanation}</p>}
                <button
                  type="button"
                  className={`btn btn--block ${feedback.correct ? 'btn--primary' : 'btn--danger'}`}
                  onClick={handleContinue}
                  data-testid="continue-button"
                >
                  TIẾP TỤC
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn--primary btn--lg btn--block"
                onClick={handleCheck}
                disabled={!checkable}
                data-testid="check-button"
              >
                KIỂM TRA
              </button>
            )}
          </div>
        </footer>
      )}

      {confirmExit && (
        <div className="modal-backdrop" onClick={() => setConfirmExit(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="modal__emoji" aria-hidden="true">
              🥺
            </p>
            <h2 id="exit-title" className="h2">
              Thoát bài học?
            </h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Tiến độ bài này sẽ mất.
            </p>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--secondary grow"
                onClick={() => setConfirmExit(false)}
              >
                Ở LẠI
              </button>
              <button type="button" className="btn btn--danger grow" onClick={handleExit}>
                THOÁT
              </button>
            </div>
          </div>
        </div>
      )}

      {heartsModal && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hearts-title"
            data-testid="hearts-modal"
          >
            <p className="modal__emoji" aria-hidden="true">
              💔
            </p>
            <h2 id="hearts-title" className="h2">
              Bạn đã hết mạng!
            </h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Nạp đầy mạng để tiếp tục bài học.
            </p>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--primary grow"
                onClick={handleRefill}
                disabled={state.gems < REFILL_COST}
                data-testid="refill-hearts"
              >
                Nạp 350 💎
              </button>
              <button type="button" className="btn btn--secondary grow" onClick={handleExit}>
                Thoát bài
              </button>
            </div>
            {state.gems < REFILL_COST && (
              <p className="modal__note">Không đủ đá quý</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
