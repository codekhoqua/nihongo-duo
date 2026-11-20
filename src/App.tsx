import { useCallback, useEffect, useState } from 'react';
import { useProgress } from './store';
import PathScreen from './features/path/PathScreen';
import LessonScreen from './features/lesson/LessonScreen';
import ProfileScreen from './features/screens/ProfileScreen';
import LeaderboardScreen from './features/screens/LeaderboardScreen';
import ShopScreen from './features/screens/ShopScreen';
import AlphabetScreen from './features/screens/AlphabetScreen';

export type Route =
  | { name: 'path' }
  | { name: 'lesson'; lessonId: string }
  | { name: 'alphabet' }
  | { name: 'leaderboard' }
  | { name: 'shop' }
  | { name: 'profile' };

const NAV: Array<{ route: Route['name']; icon: string; label: string }> = [
  { route: 'path', icon: '🦉', label: 'Học' },
  { route: 'alphabet', icon: 'あ', label: 'Chữ cái' },
  { route: 'leaderboard', icon: '🏆', label: 'BXH' },
  { route: 'shop', icon: '🛒', label: 'Cửa hàng' },
  { route: 'profile', icon: '🦊', label: 'Hồ sơ' },
];

export default function App() {
  const { state } = useProgress();
  const [route, setRoute] = useState<Route>({ name: 'path' });

  const go = useCallback((name: Route['name']) => setRoute({ name } as Route), []);
  const startLesson = useCallback((lessonId: string) => setRoute({ name: 'lesson', lessonId }), []);
  const backToPath = useCallback(() => setRoute({ name: 'path' }), []);

  // Keep the deep-link-ish hash in sync so a reload lands on the same tab.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (['path', 'alphabet', 'leaderboard', 'shop', 'profile'].includes(hash)) {
      setRoute({ name: hash } as Route);
    }
  }, []);

  useEffect(() => {
    if (route.name !== 'lesson') window.history.replaceState(null, '', `#${route.name}`);
  }, [route.name]);

  const inLesson = route.name === 'lesson';

  return (
    <div className="app-shell">
      {!inLesson && (
        <header className="topbar">
          <div className="row" style={{ gap: 8 }}>
            <span style={{ fontSize: 26 }} aria-hidden="true">
              {state.avatar}
            </span>
            <span
              className="pill pill--blue"
              title="Chuỗi ngày học liên tiếp"
              data-testid="streak-pill"
            >
              🔥 {state.streak}
            </span>
          </div>
          <div className="topbar__stats">
            <span className="topbar__stat" title="Đá quý" data-testid="gems-stat">
              <span className="topbar__stat-icon" aria-hidden="true">
                💎
              </span>
              {state.gems}
            </span>
            <span
              className={`topbar__stat${state.hearts <= 1 ? ' topbar__stat--danger' : ''}`}
              title="Mạng (hearts)"
              data-testid="hearts-stat"
            >
              <span className="topbar__stat-icon" aria-hidden="true">
                {state.hearts > 0 ? '❤️' : '🖤'}
              </span>
              {state.hearts}
            </span>
            <span className="topbar__stat" title="Kim cương/XP" data-testid="xp-stat">
              <span className="topbar__stat-icon" aria-hidden="true">
                ⚡
              </span>
              {state.xp}
            </span>
          </div>
        </header>
      )}

      <main className="grow">
        {route.name === 'path' && <PathScreen onStartLesson={startLesson} />}
        {route.name === 'lesson' && (
          <LessonScreen lessonId={route.lessonId} onExit={backToPath} />
        )}
        {route.name === 'alphabet' && <AlphabetScreen onBack={backToPath} />}
        {route.name === 'leaderboard' && <LeaderboardScreen onBack={backToPath} />}
        {route.name === 'shop' && <ShopScreen onBack={backToPath} />}
        {route.name === 'profile' && <ProfileScreen onBack={backToPath} />}
      </main>

      {!inLesson && (
        <nav className="bottomnav" aria-label="Điều hướng chính">
          <div className="bottomnav__inner">
            {NAV.map((item) => (
              <button
                key={item.route}
                type="button"
                className={`bottomnav__item${
                  route.name === item.route ? ' bottomnav__item--active' : ''
                }`}
                onClick={() => go(item.route)}
                data-testid={`nav-${item.route}`}
                aria-current={route.name === item.route ? 'page' : undefined}
              >
                <span className="bottomnav__icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
