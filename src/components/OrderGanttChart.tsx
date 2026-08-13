import { computeGanttLayout } from "../domain/gantt";
import type { SimulationState } from "../types";

interface Props {
  state: SimulationState;
  onRequestCancel: (orderId: string) => void;
}

const CHART_WIDTH = 420;
const STATUS_LABEL_WIDTH = 180;
const SVG_WIDTH = CHART_WIDTH + STATUS_LABEL_WIDTH;
const ROW_HEIGHT = 36;
const BAR_HEIGHT = 14;

const TICK_STEP_CANDIDATES = [1, 2, 5, 10, 20, 25, 50, 100];

function pickTickStep(range: number): number {
  const target = Math.max(range / 8, 1);
  return (
    TICK_STEP_CANDIDATES.find((step) => step >= target) ??
    TICK_STEP_CANDIDATES[TICK_STEP_CANDIDATES.length - 1]
  );
}

function buildTicks(minDay: number, maxDay: number): number[] {
  const step = pickTickStep(maxDay - minDay);
  const ticks: number[] = [];
  for (let day = Math.ceil(minDay / step) * step; day <= maxDay; day += step) {
    ticks.push(day);
  }
  if (ticks[0] !== minDay) ticks.unshift(minDay);
  if (ticks[ticks.length - 1] !== maxDay) ticks.push(maxDay);
  return ticks;
}

const orderStatusLabel: Record<string, string> = {
  受注済: "受注済",
  引当中: "引当中",
  出荷済: "出荷済",
  取消済: "取消済",
};

/** §18 受注一覧ガントチャート：受注ごとに1行の全体一覧。未来は描かず、今日までのみを描く */
function OrderGanttChart({ state, onRequestCancel }: Props) {
  const layout = computeGanttLayout(state);

  if (layout.rows.length === 0) {
    return (
      <section className="panel">
        <h2>受注一覧</h2>
        <p className="empty-state">受注はまだ登録されていません。</p>
      </section>
    );
  }

  const pxPerDay = CHART_WIDTH / (layout.maxDay - layout.minDay);
  const x = (day: number) => (day - layout.minDay) * pxPerDay;
  const chartHeight = layout.rows.length * ROW_HEIGHT;
  const ticks = buildTicks(layout.minDay, layout.maxDay);

  return (
    <section className="panel">
      <h2>受注一覧</h2>
      <div className="gantt-scroll">
        <div className="gantt-wrap">
          <div className="gantt-labels" style={{ height: chartHeight }}>
            {layout.rows.map((row) => {
              const order = state.orders.find((o) => o.orderId === row.orderId)!;
              return (
                <div
                  key={row.orderId}
                  className={`gantt-row-label${row.dimmed ? " dimmed" : ""}`}
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="label-text">
                    {row.label} [{orderStatusLabel[order.status]}]
                  </span>
                  {order.status === "受注済" && (
                    <button className="btn btn-sm" onClick={() => onRequestCancel(order.orderId)}>
                      取消
                    </button>
                  )}
                  {order.status === "引当中" && <span className="status-muted">取消不可</span>}
                </div>
              );
            })}
          </div>

          <svg width={SVG_WIDTH} height={chartHeight + 20} role="img" aria-label="受注一覧ガントチャート">
          {layout.rows.map((row, i) => {
            const y = i * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
            const opacity = row.dimmed ? 0.4 : 1;
            return (
              <g key={row.orderId}>
                {row.segments.map((seg, si) => (
                  <rect
                    key={si}
                    x={x(seg.from)}
                    y={y}
                    width={Math.max(x(seg.to) - x(seg.from), 1)}
                    height={BAR_HEIGHT}
                    fill={seg.kind === "in-progress" ? "var(--color-primary)" : "var(--color-gantt-waiting)"}
                    opacity={opacity}
                  />
                ))}

                {row.dueDay !== undefined && (
                  <polygon
                    points={diamondPoints(x(row.dueDay), y + BAR_HEIGHT / 2, 6)}
                    fill="var(--color-warning)"
                    opacity={opacity}
                  >
                    <title>納期 D{row.dueDay}</title>
                  </polygon>
                )}

                {row.endMarker && (
                  <text
                    x={x(row.endMarker.day) + 8}
                    y={y + BAR_HEIGHT}
                    fontSize={14}
                    opacity={opacity}
                    fill={row.endMarker.kind === "shipped" ? "var(--color-success)" : "var(--color-text-muted)"}
                  >
                    {row.endMarker.kind === "shipped" ? "✓" : "✕"}
                  </text>
                )}

                <text x={CHART_WIDTH + 8} y={y + BAR_HEIGHT} fontSize={11} fill="var(--color-axis)">
                  {row.statusLabel}
                </text>
              </g>
            );
          })}

          {/* 「今日」の位置に縦の点線を全行にわたって表示する */}
          <line
            x1={x(layout.todayDay)}
            x2={x(layout.todayDay)}
            y1={0}
            y2={chartHeight}
            stroke="var(--color-axis)"
            strokeDasharray="4 3"
          />
          <text x={x(layout.todayDay) + 3} y={chartHeight + 14} fontSize={11} fill="var(--color-axis)">
            今日(D{layout.todayDay})
          </text>

          {ticks.map((day) => (
            <text
              key={day}
              x={x(day)}
              y={chartHeight + 14}
              fontSize={10}
              fill="var(--color-axis-muted)"
              textAnchor="middle"
            >
              D{day}
            </text>
          ))}
          </svg>
        </div>
      </div>
      <p className="gantt-legend">
        グレー：待機中／アクセント色：仕掛中／◆：納期／✓：出荷済／✕：取消済
      </p>
    </section>
  );
}

function diamondPoints(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

export default OrderGanttChart;
