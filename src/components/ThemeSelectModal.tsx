import { THEME_OPTIONS, type ThemeId } from "../theme";

interface Props {
  currentTheme: ThemeId;
  onSelect: (theme: ThemeId) => void;
  onDismiss: () => void;
}

const LIGHT_THEMES = THEME_OPTIONS.filter((option) => option.group === "light");
const DARK_THEMES = THEME_OPTIONS.filter((option) => option.group === "dark");

function ThemeOptionGrid({
  options,
  currentTheme,
  onSelect,
}: {
  options: typeof THEME_OPTIONS;
  currentTheme: ThemeId;
  onSelect: (theme: ThemeId) => void;
}) {
  return (
    <div className="theme-option-grid">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`theme-option${option.id === currentTheme ? " selected" : ""}`}
          onClick={() => onSelect(option.id)}
          aria-pressed={option.id === currentTheme}
        >
          <span className="theme-option-swatch" data-theme={option.id}>
            <span className="swatch-bg" />
            <span className="swatch-primary" />
          </span>
          <span className="theme-option-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

/** ヘッダーの「スタイル」ボタンから開く、画面テーマ選択モーダル */
function ThemeSelectModal({ currentTheme, onSelect, onDismiss }: Props) {
  return (
    <div role="dialog" aria-modal="true" aria-label="画面スタイル選択" className="modal-overlay" onClick={onDismiss}>
      <div className="modal-card theme-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>画面スタイル</h3>

        <p className="theme-modal-group-label">ライト</p>
        <ThemeOptionGrid options={LIGHT_THEMES} currentTheme={currentTheme} onSelect={onSelect} />

        <p className="theme-modal-group-label">ダーク</p>
        <ThemeOptionGrid options={DARK_THEMES} currentTheme={currentTheme} onSelect={onSelect} />

        <div className="modal-actions">
          <button className="btn" onClick={onDismiss}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThemeSelectModal;
