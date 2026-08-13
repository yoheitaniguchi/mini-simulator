import type { SimulationState } from "../types";
import {
  computeActiveDomains,
  computeActiveFlows,
  DOMAIN_LABELS,
  FLOWS,
  type DomainId,
  type FlowDef,
} from "../domain/processFlow";

interface Props {
  state: SimulationState;
}

const BOX_W = 176;
const BOX_H = 64;

const NODES: Record<DomainId, { cx: number; cy: number }> = {
  order: { cx: 150, cy: 70 },
  production: { cx: 490, cy: 70 },
  shipment: { cx: 830, cy: 70 },
  master: { cx: 150, cy: 430 },
  procurement: { cx: 490, cy: 430 },
  inventory: { cx: 830, cy: 430 },
};

const DOMAIN_HINT: Record<DomainId, string> = {
  order: "顧客からの注文を記録・状態管理する",
  master: "品目・BOM・得意先／仕入先を一元管理する",
  procurement: "不足材料を発注し、入荷させる",
  inventory: "材料・仕掛品・完成品の残高を管理する",
  production: "BOMに沿って引当・仕掛・完成させる",
  shipment: "完成品を納期順に出荷する",
};

/** 対になっている流れ（同じ2ノード間を逆方向にも結ぶ流れ）に個別の曲げ量を与え、線が重ならないようにする */
const CURVE_OFFSET: Record<string, number> = {
  "order-production": -30,
  "production-order": 30,
  "order-shipment": 150,
  "shipment-order": 230,
  "production-inventory": -40,
  "inventory-production": 40,
  "shipment-inventory": -30,
  "inventory-shipment": 30,
};

/** ラベルを線ごとにずらして重なりを避けるための追加オフセット（曲線の法線方向） */
const LABEL_OFFSET: Record<string, number> = {
  "order-production": -38,
  "production-order": 44,
  "order-shipment": -16,
  "shipment-order": 16,
  "master-procurement": -12,
  "master-production": -10,
  "production-procurement": -16,
  "procurement-inventory": -12,
  "production-inventory": -30,
  "inventory-production": 34,
  "shipment-inventory": -32,
  "inventory-shipment": 32,
};

function controlPoint(x1: number, y1: number, x2: number, y2: number, offset: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  return { x: mx + px * offset, y: my + py * offset };
}

/** 中心座標から見て、方向(dirX, dirY)にある矩形の境界上の点を求める（矢印を箱の縁で止めるため） */
function clipToBox(cx: number, cy: number, dirX: number, dirY: number) {
  const hw = BOX_W / 2;
  const hh = BOX_H / 2;
  if (dirX === 0 && dirY === 0) return { x: cx, y: cy };
  const scaleX = dirX !== 0 ? hw / Math.abs(dirX) : Number.POSITIVE_INFINITY;
  const scaleY = dirY !== 0 ? hh / Math.abs(dirY) : Number.POSITIVE_INFINITY;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dirX * scale, y: cy + dirY * scale };
}

function quadraticPoint(
  p0: { x: number; y: number },
  c: { x: number; y: number },
  p2: { x: number; y: number },
  t: number,
) {
  const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * c.x + t * t * p2.x;
  const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * c.y + t * t * p2.y;
  return { x, y };
}

interface FlowGeometry {
  flow: FlowDef;
  path: string;
  labelX: number;
  labelY: number;
}

function computeFlowGeometry(flow: FlowDef): FlowGeometry {
  const from = NODES[flow.from];
  const to = NODES[flow.to];

  // A→BとB→Aの対になる流れで曲げ量・ラベル位置を画面上の一貫した向きで扱うため、
  // 実際のfrom/toではなく、ドメインIDの辞書順で固定した「正準方向」を基準に法線を計算する。
  // そうしないと逆向きの流れでは法線の符号が反転し、同じ側にオフセットしたつもりが
  // 互いに逆方向へずれて元のまま重なってしまう。
  const reversed = flow.from > flow.to;
  const canonFrom = reversed ? to : from;
  const canonTo = reversed ? from : to;

  const offset = CURVE_OFFSET[flow.id] ?? 0;
  const control = controlPoint(canonFrom.cx, canonFrom.cy, canonTo.cx, canonTo.cy, offset);

  const start = clipToBox(from.cx, from.cy, control.x - from.cx, control.y - from.cy);
  const end = clipToBox(to.cx, to.cy, control.x - to.cx, control.y - to.cy);

  const path = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;

  const labelOffset = LABEL_OFFSET[flow.id] ?? 0;
  const mid = quadraticPoint(start, control, end, 0.5);
  const dx = canonTo.cx - canonFrom.cx;
  const dy = canonTo.cy - canonFrom.cy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  return {
    flow,
    path,
    labelX: mid.x + nx * labelOffset,
    labelY: mid.y + ny * labelOffset,
  };
}

/**
 * 受注〜出荷のプロセス連携図（design.md §2のIPO表に基づく）。
 * BPMN風に、各ドメインを1つのプール（矩形）として表し、ドメイン間の点線＋矢印
 * （BPMNのメッセージフロー相当）でモノ・データの向きを示す。
 * 「本日」＝直前に「次の日へ進む」で処理された日に実際に動いた流れだけをアクセント色でハイライトする。
 */
function ProcessFlowDiagram({ state }: Props) {
  const { lastDay, flowIds } = computeActiveFlows(state);
  const activeDomains = computeActiveDomains(flowIds);
  const geometries = FLOWS.map(computeFlowGeometry);
  const activeFlowDefs = FLOWS.filter((flow) => flowIds.has(flow.id));

  return (
    <section className="panel">
      <h2>受注〜出荷 プロセス連携図</h2>
      <p>
        受注・マスタ・調達・在庫・生産・出荷の各ドメインを1つのプロセスとして表し、ドメイン間を結ぶ点線が
        「どちらからどちらへモノ・データが流れるか」を表す（矢印の先が受け取る側）。アクセント色の実線は、直前に
        「次の日へ進む」で実際に動いた流れ。
      </p>

      <div className="process-flow-scroll">
        <svg
          viewBox="-20 -10 1000 520"
          width="980"
          height="500"
          role="img"
          aria-label="受注から出荷までのドメイン間のプロセス連携図"
        >
          <defs>
            <marker id="pf-start-active" markerWidth={10} markerHeight={10} refX={5} refY={5}>
              <circle
                cx={5}
                cy={5}
                r={3.5}
                fill="var(--color-surface)"
                stroke="var(--color-primary)"
                strokeWidth={1.5}
              />
            </marker>
            <marker id="pf-start-idle" markerWidth={10} markerHeight={10} refX={5} refY={5}>
              <circle
                cx={5}
                cy={5}
                r={3.5}
                fill="var(--color-surface)"
                stroke="var(--color-flow-idle)"
                strokeWidth={1.5}
              />
            </marker>
            <marker
              id="pf-end-active"
              markerWidth={12}
              markerHeight={12}
              refX={8}
              refY={5}
              orient="auto-start-reverse"
            >
              <path d="M1,1 L9,5 L1,9" fill="none" stroke="var(--color-primary)" strokeWidth={1.6} />
            </marker>
            <marker
              id="pf-end-idle"
              markerWidth={12}
              markerHeight={12}
              refX={8}
              refY={5}
              orient="auto-start-reverse"
            >
              <path d="M1,1 L9,5 L1,9" fill="none" stroke="var(--color-flow-idle)" strokeWidth={1.6} />
            </marker>
          </defs>

          {geometries.map(({ flow, path, labelX, labelY }) => {
            const active = flowIds.has(flow.id);
            const stroke = active ? "var(--color-primary)" : "var(--color-flow-idle)";
            return (
              <g key={flow.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={active ? 2.2 : 1.3}
                  strokeDasharray={active ? "0" : "5 4"}
                  markerStart={`url(#${active ? "pf-start-active" : "pf-start-idle"})`}
                  markerEnd={`url(#${active ? "pf-end-active" : "pf-end-idle"})`}
                  opacity={active ? 1 : 0.75}
                />
                <rect
                  x={labelX - flow.label.length * 5.3 - 4}
                  y={labelY - 9}
                  width={flow.label.length * 10.6 + 8}
                  height={14}
                  fill="var(--color-surface)"
                  opacity={0.9}
                />
                <text
                  x={labelX}
                  y={labelY + 1}
                  fontSize={10.5}
                  textAnchor="middle"
                  fill={active ? "var(--color-primary-hover)" : "var(--color-text-muted)"}
                  fontWeight={active ? 600 : 400}
                >
                  {flow.label}
                </text>
              </g>
            );
          })}

          {(Object.keys(NODES) as DomainId[]).map((id) => {
            const { cx, cy } = NODES[id];
            const active = activeDomains.has(id);
            return (
              <g key={id}>
                <rect
                  x={cx - BOX_W / 2}
                  y={cy - BOX_H / 2}
                  width={BOX_W}
                  height={BOX_H}
                  rx={12}
                  fill={active ? "var(--color-primary-soft)" : "var(--color-surface)"}
                  stroke={active ? "var(--color-primary)" : "var(--color-flow-idle)"}
                  strokeWidth={active ? 2.4 : 1.5}
                />
                <text
                  x={cx}
                  y={cy - 6}
                  textAnchor="middle"
                  fontSize={15}
                  fontWeight={700}
                  fill="var(--color-text)"
                >
                  {DOMAIN_LABELS[id]}
                </text>
                <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9.5} fill="var(--color-text-muted)">
                  {DOMAIN_HINT[id]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="process-flow-legend">
        丸：流れの起点／矢印：流れの終点（受け取る側）／点線＋グレー：現在動きのない流れ／実線＋アクセント色：本日動いた流れ
      </p>

      <div className="process-flow-today">
        <h3>本日動いたモノ・データ{lastDay !== null && `（D${lastDay}）`}</h3>
        {lastDay === null ? (
          <p className="empty-state">
            まだ「次の日へ進む」を一度も押していません。押すとD0の処理内容がここに表示されます。
          </p>
        ) : activeFlowDefs.length === 0 ? (
          <p className="empty-state">D{lastDay}は、ドメイン間で動いたモノ・データはありませんでした。</p>
        ) : (
          <ul className="event-log">
            {activeFlowDefs.map((flow) => (
              <li key={flow.id}>
                {DOMAIN_LABELS[flow.from]} → {DOMAIN_LABELS[flow.to]}：{flow.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default ProcessFlowDiagram;
