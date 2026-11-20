import { HIRAGANA, KANA_ROWS } from '../../../content/kana';

interface Props {
  onInsert: (char: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

/** Extra keys that are not part of the 46-character chart. */
const EXTRA_KEYS: ReadonlyArray<{ char: string; romaji: string }> = [
  { char: 'ゃ', romaji: 'ya' },
  { char: 'ゅ', romaji: 'yu' },
  { char: 'ょ', romaji: 'yo' },
  { char: 'っ', romaji: 'tsu (nhỏ)' },
  { char: 'ー', romaji: 'trường âm' },
];

/**
 * On-screen hiragana keyboard for learners without a Japanese IME.
 * Tapping a key appends the character to the answer input.
 */
export default function KanaPad({ onInsert, onBackspace, disabled = false }: Props) {
  const rows = KANA_ROWS.hiragana.map((row) => HIRAGANA.filter((kana) => kana.row === row));

  return (
    <div className="kana-pad" role="group" aria-label="Bảng kana">
      <div className="kana-pad__grid">
        {rows.map((keys, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <div className="kana-pad__row" key={`row-${index}`}>
            {keys.map((kana) => (
              <button
                key={kana.id}
                type="button"
                className="kana-key"
                aria-label={`${kana.char} (${kana.romaji})`}
                data-testid={`kana-${kana.char}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onInsert(kana.char)}
                disabled={disabled}
              >
                <span className="kana-key__char jp">{kana.char}</span>
                <span className="kana-key__romaji">{kana.romaji}</span>
              </button>
            ))}
          </div>
        ))}

        <div className="kana-pad__row">
          {EXTRA_KEYS.map((key) => (
            <button
              key={key.char}
              type="button"
              className="kana-key"
              aria-label={`${key.char} (${key.romaji})`}
              data-testid={`kana-${key.char}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onInsert(key.char)}
              disabled={disabled}
            >
              <span className="kana-key__char jp">{key.char}</span>
              <span className="kana-key__romaji">{key.romaji}</span>
            </button>
          ))}
          <button
            type="button"
            className="kana-key kana-key--wide"
            aria-label="Xoá một ký tự"
            data-testid="kana-backspace"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onBackspace}
            disabled={disabled}
          >
            <span className="kana-key__char" aria-hidden="true">
              ⌫
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
