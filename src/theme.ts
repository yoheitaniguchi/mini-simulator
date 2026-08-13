export type ThemeId =
  | "material-light"
  | "soft-paper"
  | "glass-light"
  | "deep-gray"
  | "true-black"
  | "midnight-navy";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  group: "light" | "dark";
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "material-light", label: "マテリアル・クリーン", group: "light" },
  { id: "soft-paper", label: "ソフトペーパー", group: "light" },
  { id: "glass-light", label: "グラスモフィズム・ライト", group: "light" },
  { id: "deep-gray", label: "ディープグレー", group: "dark" },
  { id: "true-black", label: "トゥルーブラック", group: "dark" },
  { id: "midnight-navy", label: "ダークネイビー・ミッドナイト", group: "dark" },
];

const STORAGE_KEY = "mini-simulator-theme";
const DEFAULT_THEME: ThemeId = "material-light";

function isThemeId(value: string | null): value is ThemeId {
  return THEME_OPTIONS.some((option) => option.id === value);
}

export function loadStoredTheme(): ThemeId {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isThemeId(stored) ? stored : DEFAULT_THEME;
}

export function storeTheme(theme: ThemeId): void {
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function applyThemeToDocument(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
}
