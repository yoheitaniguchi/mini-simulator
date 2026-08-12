import type { SimulationState } from "../types";

interface Props {
  state: SimulationState;
}

/**
 * §13 本日の出来事ログ：「次の日へ進む」を押すたびに、その日実際に起きたことのみを時系列で表示する。
 * §8の5ステップのうち何も起きなかったステップは表示しない（＝ログに何も追加されない）ため、
 * このコンポーネントは単に蓄積されたログをそのまま新しい順に表示すればよい。
 */
function EventLogPanel({ state }: Props) {
  const entries = state.eventLog.slice().reverse();

  return (
    <section>
      <h2>本日の出来事ログ</h2>
      {entries.length === 0 ? (
        <p>まだ何も起きていません。「次の日へ進む」を押してください。</p>
      ) : (
        <ul style={{ maxHeight: 240, overflowY: "auto", paddingLeft: 20 }}>
          {entries.map((entry, i) => (
            <li key={i}>
              D{entry.day}: {entry.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default EventLogPanel;
