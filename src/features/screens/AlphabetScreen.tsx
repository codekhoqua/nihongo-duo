import { useState } from 'react';
import type { KanaScript } from '../../types';
import { HIRAGANA, KATAKANA, KANA_ROWS } from '../../content/kana';
import { speak } from '../../lib/speech';
import { useProgress } from '../../store';
import './screens.css';

export default function AlphabetScreen({ onBack }: { onBack: () => void }) {
  const { state } = useProgress();
  const [script, setScript] = useState<KanaScript>('hiragana');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const chars = script === 'hiragana' ? HIRAGANA : KATAKANA;
  const rows = KANA_ROWS[script];
  const selected = chars.find((char) => char.id === selectedId) ?? null;

  function switchScript(next: KanaScript) {
    setScript(next);
    setSelectedId(null);
  }

  function pick(id: string, char: string) {
    setSelectedId(id);
    speak(char, { enabled: state.settings.speechOn });
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Quay lại">
          ←
        </button>
        <span className="screen-head__title">Bảng chữ cái</span>
      </div>

      <div className="tabs alphabet-tabs" role="tablist" aria-label="Chọn bảng chữ">
        <button
          type="button"
          role="tab"
          aria-selected={script === 'hiragana'}
          className={`tab${script === 'hiragana' ? ' tab--active' : ''}`}
          data-testid="alphabet-tab-hiragana"
          onClick={() => switchScript('hiragana')}
        >
          Hiragana
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={script === 'katakana'}
          className={`tab${script === 'katakana' ? ' tab--active' : ''}`}
          data-testid="alphabet-tab-katakana"
          onClick={() => switchScript('katakana')}
        >
          Katakana
        </button>
      </div>

      <div className="kana-grid" data-testid="kana-grid">
        {rows.map((row) => {
          const rowChars = chars.filter((char) => char.row === row);
          if (rowChars.length === 0) return null;
          return (
            <div className="kana-row" key={row}>
              <span className="kana-row__label" aria-hidden="true">
                {row}
              </span>
              <div className="kana-row__cells">
                {rowChars.map((char) => (
                  <button
                    key={char.id}
                    type="button"
                    className={`kana-cell${selectedId === char.id ? ' kana-cell--active' : ''}`}
                    data-testid={`kana-cell-${char.char}`}
                    aria-pressed={selectedId === char.id}
                    aria-label={`${char.char}, đọc là ${char.romaji}`}
                    onClick={() => pick(char.id, char.char)}
                  >
                    <span className="kana-cell__char jp">{char.char}</span>
                    <span className="kana-cell__romaji">{char.romaji}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="kana-detail" aria-live="polite">
        {selected ? (
          <>
            <span className="kana-detail__char jp">{selected.char}</span>
            <div className="kana-detail__body">
              <div className="kana-detail__romaji">{selected.romaji}</div>
              <div className="kana-detail__example">
                {selected.example ? (
                  <>
                    <span className="jp">{selected.example}</span> · {selected.exampleMeaning}
                  </>
                ) : (
                  'Chưa có ví dụ cho âm này.'
                )}
              </div>
            </div>
            <button
              type="button"
              className="btn__audio kana-detail__audio"
              aria-label={`Nghe ${selected.char}`}
              onClick={() => speak(selected.char, { enabled: state.settings.speechOn })}
            >
              🔊
            </button>
          </>
        ) : (
          <p className="kana-detail__empty">Chạm vào một ký tự để nghe và xem ví dụ.</p>
        )}
      </div>
    </div>
  );
}
