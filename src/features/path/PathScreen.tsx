import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { isLessonUnlocked, useDailyQuests, useProgress } from '../../store';
import { ALL_LESSON_IDS, UNITS } from '../../content';
import type { Lesson, LessonIcon, Unit } from '../../types';
import './path.css';

/** Zig-zag offsets (px) applied to node index % 8. */
const NODE_OFFSETS = [0, 42, 68, 42, 0, -42, -68, -42];
const LINK_HEIGHT = 32;
const REFILL_COST = 350;

const LESSON_ICONS: Record<LessonIcon, string> = {
  star: '⭐',
  book: '📘',
  chat: '💬',
  mic: '🎤',
  trophy: '🏆',
  chest: '🎁',
  dumbbell: '💪',
  story: '📖',
};

const LEADERBOARD = [
  { name: 'Yuki', avatar: '🐰', xp: 1240, medal: '🥇' },
  { name: 'Hana', avatar: '🐼', xp: 985, medal: '🥈' },
  { name: 'Kenji', avatar: '🐯', xp: 742, medal: '🥉' },
];

type NodeStatus = 'done' | 'current' | 'available' | 'locked';

function offsetFor(index: number): number {
  return NODE_OFFSETS[index % NODE_OFFSETS.length];
}

/** Dark or light text depending on the banner colour. */
function readableOn(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return '#ffffff';
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#3c3c3c' : '#ffffff';
}

function linkStyle(from: number, to: number): CSSProperties {
  const deltaX = to - from;
  const length = Math.hypot(deltaX, LINK_HEIGHT);
  const angle = (Math.atan2(LINK_HEIGHT, deltaX) * 180) / Math.PI;
  return {
    width: `${length}px`,
    transform: `translate(-50%, -50%) translateX(${(from + to) / 2}px) rotate(${angle}deg)`,
  };
}

function nodeLabel(lesson: Lesson, status: NodeStatus, crowns: number): string {
  const base = `${lesson.title} — ${lesson.subtitle}`;
  switch (status) {
    case 'done':
      return `${base}. Đã hoàn thành, ${crowns} vương miện. Nhấn để học lại.`;
    case 'current':
      return `${base}. Bài học hiện tại. Nhấn để bắt đầu.`;
    case 'available':
      return `${base}. Có thể học.`;
    case 'locked':
    default:
      return `${base}. Đã khoá, hãy hoàn thành bài trước.`;
  }
}

export default function PathScreen({ onStartLesson }: { onStartLesson: (lessonId: string) => void }) {
  const { state, dispatch } = useProgress();
  const quests = useDailyQuests();

  const [toast, setToast] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [tipUnitId, setTipUnitId] = useState<string | null>(null);
  const [jumpOpen, setJumpOpen] = useState(false);

  const toastTimer = useRef<number | null>(null);
  const shakeTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
    },
    [],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const shake = useCallback((lessonId: string) => {
    setShakeId(lessonId);
    if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => setShakeId(null), 460);
  }, []);

  const currentLessonId = useMemo(
    () =>
      ALL_LESSON_IDS.find(
        (id) => (state.crowns[id] ?? 0) === 0 && isLessonUnlocked(state, ALL_LESSON_IDS, id),
      ) ?? null,
    [state],
  );

  const closeDialogs = useCallback(() => {
    setTipUnitId(null);
    setJumpOpen(false);
  }, []);

  useEffect(() => {
    if (!tipUnitId && !jumpOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialogs();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tipUnitId, jumpOpen, closeDialogs]);

  const statusOf = (lesson: Lesson): NodeStatus => {
    const crowns = state.crowns[lesson.id] ?? 0;
    if (crowns > 0) return 'done';
    if (lesson.id === currentLessonId) return 'current';
    if (!isLessonUnlocked(state, ALL_LESSON_IDS, lesson.id)) return 'locked';
    return 'available';
  };

  const handleNodeClick = (lesson: Lesson, status: NodeStatus) => {
    if (status === 'locked') {
      shake(lesson.id);
      showToast('Hoàn thành bài trước nhé!');
      return;
    }
    onStartLesson(lesson.id);
  };

  const tipUnit: Unit | undefined = tipUnitId
    ? UNITS.find((unit) => unit.id === tipUnitId)
    : undefined;
  const tipLesson = tipUnit
    ? (tipUnit.lessons.find((lesson) => lesson.tip) ?? tipUnit.lessons[0])
    : undefined;

  const heartsEmpty = state.hearts === 0;
  const canRefill = state.gems >= REFILL_COST;

  return (
    <div className="screen path">
      {heartsEmpty && (
        <div className="hearts-banner" role="alert" data-testid="hearts-banner">
          <span className="hearts-banner__text">
            <span aria-hidden="true">💔</span> Bạn đã hết mạng!
          </span>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => dispatch({ type: 'refill-hearts' })}
            disabled={!canRefill}
            data-testid="refill-hearts-banner"
          >
            Nạp mạng ({REFILL_COST} 💎)
          </button>
          {!canRefill && <span className="hearts-banner__note">Không đủ đá quý</span>}
        </div>
      )}

      <div className="path-layout">
        <div className="path-main">
          {UNITS.map((unit) => {
            const bannerFg = readableOn(unit.color);
            return (
              <section className="unit" key={unit.id} aria-labelledby={`unit-${unit.id}-title`}>
                <header
                  className="unit-banner"
                  style={{ background: unit.color, color: bannerFg }}
                >
                  <div className="unit-banner__text">
                    <span className="unit-banner__index">Chặng {unit.index}</span>
                    <h2 className="unit-banner__title" id={`unit-${unit.id}-title`}>
                      {unit.title}
                    </h2>
                    <p className="unit-banner__subtitle">{unit.subtitle}</p>
                  </div>
                  <div className="unit-banner__actions">
                    <button
                      type="button"
                      className="btn btn--sm unit-banner__btn"
                      onClick={() => setTipUnitId(unit.id)}
                      data-testid={`unit-tip-${unit.id}`}
                    >
                      Hướng dẫn
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm unit-banner__btn"
                      onClick={() => setJumpOpen(true)}
                      data-testid={`unit-jump-${unit.id}`}
                    >
                      Nhảy cóc
                    </button>
                  </div>
                </header>

                <ul className="unit-path">
                  {unit.lessons.map((lesson, index) => {
                    const status = statusOf(lesson);
                    const crowns = state.crowns[lesson.id] ?? 0;
                    const offset = offsetFor(index);
                    const previousOffset = index > 0 ? offsetFor(index - 1) : 0;
                    return (
                      <Fragment key={lesson.id}>
                        {index > 0 && (
                          <li className="path-link-row" aria-hidden="true">
                            <span
                              className={`path-link${
                                status === 'done' ? ' path-link--done' : ''
                              }`}
                              style={linkStyle(previousOffset, offset)}
                            />
                          </li>
                        )}
                        <li
                          className="path-row"
                          style={{ transform: `translateX(${offset}px)` }}
                        >
                          {status === 'current' && (
                            <span className="path-bubble" aria-hidden="true">
                              BẮT ĐẦU
                            </span>
                          )}
                          <button
                            type="button"
                            className={`path-node path-node--${status}${
                              shakeId === lesson.id ? ' path-node--shake' : ''
                            }`}
                            onClick={() => handleNodeClick(lesson, status)}
                            aria-label={nodeLabel(lesson, status, crowns)}
                            data-testid={`lesson-node-${lesson.id}`}
                          >
                            <span className="path-node__icon" aria-hidden="true">
                              {status === 'locked'
                                ? '🔒'
                                : status === 'done'
                                  ? '👑'
                                  : LESSON_ICONS[lesson.icon] ?? '⭐'}
                            </span>
                            {status === 'done' && (
                              <span className="path-node__crown" aria-hidden="true">
                                👑 {crowns}
                              </span>
                            )}
                          </button>
                          <span className="path-node__caption">{lesson.title}</span>
                        </li>
                      </Fragment>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <aside className="path-rail stack-16" aria-label="Bảng thông tin">
          <section className="card rail-card" data-testid="daily-quests">
            <h3 className="card__title">Nhiệm vụ hằng ngày</h3>
            <ul className="quest-list">
              {quests.map((quest) => {
                const percent = Math.min(100, Math.round((quest.value / Math.max(1, quest.goal)) * 100));
                return (
                  <li className="quest" key={quest.id}>
                    <div className="quest__head">
                      <span aria-hidden="true">{quest.icon}</span>
                      <span className="quest__label">{quest.label}</span>
                      <span className="quest__value">
                        {quest.value}/{quest.goal}
                      </span>
                    </div>
                    <div
                      className="progress progress--thin"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={quest.goal}
                      aria-valuenow={Math.min(quest.value, quest.goal)}
                      aria-label={quest.label}
                    >
                      <div
                        className={`progress__fill${percent >= 100 ? '' : ' progress__fill--blue'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card rail-card" data-testid="streak-card">
            <h3 className="card__title">Chuỗi ngày</h3>
            <div className="streak-card">
              <span className="streak-card__fire" aria-hidden="true">
                🔥
              </span>
              <div>
                <p className="streak-card__value">{state.streak}</p>
                <p className="streak-card__label">ngày liên tiếp</p>
              </div>
            </div>
            <p className="streak-card__best">Kỷ lục: {state.longestStreak} ngày</p>
          </section>

          <section className="card rail-card" data-testid="leaderboard-card">
            <h3 className="card__title">Bảng xếp hạng</h3>
            <ul className="mini-board">
              {LEADERBOARD.map((row) => (
                <li className="mini-board__row" key={row.name}>
                  <span className="mini-board__medal" aria-hidden="true">
                    {row.medal}
                  </span>
                  <span className="mini-board__avatar" aria-hidden="true">
                    {row.avatar}
                  </span>
                  <span className="mini-board__name">{row.name}</span>
                  <span className="mini-board__xp">{row.xp} XP</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {toast && (
        <div className="path-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {tipUnit && (
        <div className="modal-backdrop" onClick={closeDialogs}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tip-title"
            onClick={(event) => event.stopPropagation()}
            data-testid="tip-modal"
          >
            <p className="modal__emoji" aria-hidden="true">
              💡
            </p>
            <h2 className="h2" id="tip-title">
              {tipUnit.title}
            </h2>
            {tipLesson && <p className="tip-modal__lesson">{tipLesson.title}</p>}
            <p className="tip-modal__text">
              {tipLesson?.tip ?? 'Chặng này chưa có hướng dẫn. Cứ bắt đầu bài đầu tiên nhé!'}
            </p>
            <div className="modal__actions">
              <button type="button" className="btn btn--primary grow" onClick={closeDialogs}>
                ĐÃ HIỂU
              </button>
            </div>
          </div>
        </div>
      )}

      {jumpOpen && (
        <div className="modal-backdrop" onClick={closeDialogs}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="jump-title"
            onClick={(event) => event.stopPropagation()}
            data-testid="jump-modal"
          >
            <p className="modal__emoji" aria-hidden="true">
              🚀
            </p>
            <h2 className="h2" id="jump-title">
              Nhảy cóc
            </h2>
            <p className="tip-modal__text">
              Bài kiểm tra xếp lớp sẽ sớm ra mắt. Trong lúc chờ, hãy học lần lượt từng bài để không
              bỏ lỡ kiến thức nhé!
            </p>
            <div className="modal__actions">
              <button type="button" className="btn btn--primary grow" onClick={closeDialogs}>
                ĐÃ HIỂU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
