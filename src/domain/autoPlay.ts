// 自動再生の速度設定。
// レベル0＝手動（自動再生なし）、レベル1〜5＝0.3秒〜1.2秒の範囲を5段階で均等割りした間隔。
export const AUTO_PLAY_INTERVALS_MS = [0, 300, 525, 750, 975, 1200] as const;

export const AUTO_PLAY_SPEED_LABELS = ["手動", "0.3秒", "0.525秒", "0.75秒", "0.975秒", "1.2秒"] as const;

export const AUTO_PLAY_MAX_LEVEL = AUTO_PLAY_INTERVALS_MS.length - 1;
