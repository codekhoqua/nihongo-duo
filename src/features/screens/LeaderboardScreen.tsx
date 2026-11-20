import { useState } from 'react';
import { useProgress } from '../../store';
import './screens.css';

interface Player {
  name: string;
  emoji: string;
  week: number;
  all: number;
}

const PLAYERS: Player[] = [
  { name: 'Yuki', emoji: '🐱', week: 620, all: 7420 },
  { name: 'Kenji', emoji: '🦊', week: 540, all: 6180 },
  { name: 'Aiko', emoji: '🐼', week: 480, all: 5230 },
  { name: 'Ryo', emoji: '🐯', week: 430, all: 4870 },
  { name: 'Mei', emoji: '🐸', week: 390, all: 4310 },
  { name: 'Haru', emoji: '🦉', week: 350, all: 3980 },
  { name: 'Sora', emoji: '🐨', week: 300, all: 3540 },
  { name: 'Nao', emoji: '🦄', week: 260, all: 3110 },
  { name: 'Taro', emoji: '🐶', week: 220, all: 2680 },
  { name: 'Hana', emoji: '🐰', week: 180, all: 2250 },
  { name: 'Jun', emoji: '🐻', week: 140, all: 1830 },
  { name: 'Mio', emoji: '🐹', week: 100, all: 1420 },
];

const MEDALS = ['🥇', '🥈', '🥉'];

type Tab = 'week' | 'all';

export default function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const { state } = useProgress();
  const [tab, setTab] = useState<Tab>('week');

  const rows = [
    ...PLAYERS.map((player, index) => ({
      id: `p${index}`,
      name: player.name,
      emoji: player.emoji,
      xp: tab === 'week' ? player.week : player.all,
      me: false,
    })),
    {
      id: 'me',
      name: state.username,
      emoji: state.avatar,
      xp: tab === 'week' ? state.dailyXp : state.xp,
      me: true,
    },
  ].sort((a, b) => b.xp - a.xp);

  const myRank = rows.findIndex((row) => row.me) + 1;

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Quay lại">
          ←
        </button>
        <span className="screen-head__title">Bảng xếp hạng</span>
      </div>

      <div className="tabs" role="tablist" aria-label="Khoảng thời gian">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'week'}
          className={`tab${tab === 'week' ? ' tab--active' : ''}`}
          data-testid="leaderboard-tab-week"
          onClick={() => setTab('week')}
        >
          Tuần này
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all'}
          className={`tab${tab === 'all' ? ' tab--active' : ''}`}
          data-testid="leaderboard-tab-all"
          onClick={() => setTab('all')}
        >
          Tất cả thời gian
        </button>
      </div>

      <p className="leaderboard-note" role="note">
        <span aria-hidden="true">🏅</span>
        Bạn đang ở hạng {myRank}. 3 người dẫn đầu sẽ thăng hạng.
      </p>

      <ol className="leaderboard-list">
        {rows.map((row, index) => (
          <li
            key={row.id}
            className={`leaderboard-row${row.me ? ' leaderboard-row--me' : ''}`}
            data-testid={row.me ? 'leaderboard-me' : undefined}
          >
            <span className="leaderboard-row__rank" aria-label={`Hạng ${index + 1}`}>
              {index < 3 ? MEDALS[index] : index + 1}
            </span>
            <span className="leaderboard-row__avatar" aria-hidden="true">
              {row.emoji}
            </span>
            <span className="leaderboard-row__name">
              {row.name}
              {row.me && <span className="leaderboard-row__tag">Bạn</span>}
            </span>
            <span className="leaderboard-row__xp">⚡ {row.xp}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
