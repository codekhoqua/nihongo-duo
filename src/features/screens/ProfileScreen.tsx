import { useState } from 'react';
import type { FormEvent } from 'react';
import { useProgress, useReset } from '../../store';
import './screens.css';

const AVATARS = ['🦊', '🐱', '🐼', '🐸', '🦉', '🐯', '🐨', '🦄'];

export default function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { state, dispatch, accuracy } = useProgress();
  const reset = useReset();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.username);

  const level = Math.floor(state.xp / 50) + 1;

  const achievements = [
    { id: 'streak3', icon: '🔥', title: 'Chuỗi 3 ngày', desc: 'Học 3 ngày liên tiếp', done: state.streak >= 3 },
    { id: 'streak7', icon: '🌟', title: 'Chuỗi 7 ngày', desc: 'Học 7 ngày liên tiếp', done: state.streak >= 7 },
    { id: 'xp100', icon: '⚡', title: '100 XP', desc: 'Tích luỹ 100 XP', done: state.xp >= 100 },
    { id: 'perfect', icon: '💎', title: 'Bài hoàn hảo', desc: 'Hoàn thành 1 bài không sai', done: state.perfectLessons >= 1 },
    { id: 'lessons10', icon: '📘', title: '10 bài học', desc: 'Hoàn thành 10 bài', done: state.completedLessons.length >= 10 },
    { id: 'accuracy', icon: '🎯', title: 'Chính xác 90%', desc: 'Đạt độ chính xác 90%', done: accuracy >= 90 },
  ];

  const stats = [
    { id: 'streak', icon: '🔥', value: `${state.streak}`, label: 'Chuỗi ngày' },
    { id: 'xp', icon: '⚡', value: `${state.xp}`, label: 'Tổng XP' },
    { id: 'lessons', icon: '👑', value: `${state.completedLessons.length}`, label: 'Bài đã xong' },
    { id: 'accuracy', icon: '🎯', value: `${accuracy}%`, label: 'Chính xác' },
  ];

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: 'set-username', username: draft.trim() });
    setEditing(false);
  }

  function chooseAvatar(avatar: string) {
    dispatch({ type: 'hydrate', state: { ...state, avatar } });
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Quay lại">
          ←
        </button>
        <span className="screen-head__title">Hồ sơ</span>
      </div>

      <header className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">
          {state.avatar}
        </div>
        <div className="profile-name">
          {editing ? (
            <form className="profile-name__form" onSubmit={saveName}>
              <input
                className="profile-name__input"
                value={draft}
                maxLength={20}
                aria-label="Tên hiển thị"
                onChange={(event) => setDraft(event.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn--primary btn--sm">
                Lưu
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="profile-name__button"
              onClick={() => {
                setDraft(state.username);
                setEditing(true);
              }}
            >
              {state.username}
              <span aria-hidden="true">✏️</span>
            </button>
          )}
          <p className="profile-hero__sub">
            Cấp {level} · {state.longestStreak} ngày dài nhất
          </p>
        </div>
      </header>

      <div className="avatar-picker" role="group" aria-label="Chọn ảnh đại diện">
        {AVATARS.map((avatar) => (
          <button
            key={avatar}
            type="button"
            className={`avatar-option${state.avatar === avatar ? ' avatar-option--active' : ''}`}
            aria-pressed={state.avatar === avatar}
            aria-label={`Ảnh đại diện ${avatar}`}
            onClick={() => chooseAvatar(avatar)}
          >
            {avatar}
          </button>
        ))}
      </div>

      <div className="stat-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.id}>
            <span className="stat-card__icon" aria-hidden="true">
              {stat.icon}
            </span>
            <div>
              <div className="stat-card__value" data-testid={stat.id === 'xp' ? 'profile-xp' : undefined}>
                {stat.value}
              </div>
              <div className="stat-card__label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="section-title">Thành tích</h2>
      <ul className="achievement-list">
        {achievements.map((item) => (
          <li
            key={item.id}
            className={`achievement${item.done ? '' : ' achievement--locked'}`}
            aria-label={`${item.title}: ${item.done ? 'đã mở' : 'chưa mở'}`}
          >
            <span className="achievement__icon" aria-hidden="true">
              {item.icon}
            </span>
            <div className="grow">
              <div className="achievement__title">{item.title}</div>
              <div className="achievement__desc">{item.desc}</div>
            </div>
            <span className="pill">{item.done ? 'Đã mở' : 'Khoá'}</span>
          </li>
        ))}
      </ul>

      <h2 className="section-title">Cài đặt</h2>
      <div className="setting-list">
        <button
          type="button"
          role="switch"
          aria-checked={state.settings.soundOn}
          className="setting-row"
          onClick={() => dispatch({ type: 'toggle-setting', key: 'soundOn' })}
        >
          <span className="setting-row__label">🔊 Hiệu ứng âm thanh</span>
          <span className={`switch${state.settings.soundOn ? ' switch--on' : ''}`} aria-hidden="true">
            <span className="switch__dot" />
          </span>
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={state.settings.speechOn}
          className="setting-row"
          onClick={() => dispatch({ type: 'toggle-setting', key: 'speechOn' })}
        >
          <span className="setting-row__label">🗣️ Đọc tiếng Nhật</span>
          <span className={`switch${state.settings.speechOn ? ' switch--on' : ''}`} aria-hidden="true">
            <span className="switch__dot" />
          </span>
        </button>
      </div>

      <div className="profile-danger">
        <button type="button" className="btn btn--danger btn--block" onClick={reset}>
          Xoá tiến độ
        </button>
      </div>
    </div>
  );
}
