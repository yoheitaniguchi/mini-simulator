// 受注一覧ガントチャート（docs/design.md §18）用の表示データを計算する純粋関数。
// UI（コンポーネント）からはこの層が返すデータをそのまま描画するだけにし、
// 「未来は描かず、今日までに実際に起きたことのみを描く」判定ロジックはここに集約する。
import type { Order, SimulationState } from "../types";
import { describeOrderActivity } from "./logic";

export type GanttSegmentKind = "waiting" | "in-progress";

export interface GanttSegment {
  from: number;
  to: number;
  kind: GanttSegmentKind;
}

export type GanttEndMarkerKind = "shipped" | "cancelled";

export interface GanttEndMarker {
  day: number;
  kind: GanttEndMarkerKind;
}

export interface GanttRow {
  orderId: string;
  label: string;
  segments: GanttSegment[];
  /** 取消済の受注は納期の意味がなくなるため undefined */
  dueDay?: number;
  endMarker?: GanttEndMarker;
  statusLabel: string;
  dimmed: boolean;
}

export interface GanttLayout {
  minDay: number;
  maxDay: number;
  todayDay: number;
  rows: GanttRow[];
}

function customerName(state: SimulationState, customerId: string): string {
  return state.customers.find((c) => c.customerId === customerId)?.name ?? customerId;
}

function computeRow(state: SimulationState, order: Order): GanttRow {
  const dimmed = order.status === "取消済";
  let endMarker: GanttEndMarker | undefined;
  let barEnd: number;

  if (order.status === "取消済") {
    barEnd = order.cancelledDay ?? order.orderedDay;
    endMarker = { day: barEnd, kind: "cancelled" };
  } else if (order.status === "出荷済") {
    barEnd = order.shippedDay ?? order.orderedDay;
    endMarker = { day: barEnd, kind: "shipped" };
  } else {
    // 受注済／引当中：未来は描かず「今日」までを描く
    barEnd = state.day;
  }

  const segments: GanttSegment[] = [];
  const allocatedFrom = order.firstAllocatedDay;
  if (allocatedFrom !== undefined && allocatedFrom > order.orderedDay) {
    segments.push({ from: order.orderedDay, to: allocatedFrom, kind: "waiting" });
    segments.push({ from: allocatedFrom, to: barEnd, kind: "in-progress" });
  } else if (allocatedFrom !== undefined) {
    segments.push({ from: order.orderedDay, to: barEnd, kind: "in-progress" });
  } else {
    segments.push({ from: order.orderedDay, to: barEnd, kind: "waiting" });
  }

  return {
    orderId: order.orderId,
    label: `${order.orderId}（${customerName(state, order.customerId)}）`,
    segments,
    dueDay: order.status === "取消済" ? undefined : order.dueDay,
    endMarker,
    statusLabel: describeOrderActivity(state, order),
    dimmed,
  };
}

/** 全受注の登録日〜納期の範囲（＋今日）に応じて自動的にスケールするレイアウトを計算する */
export function computeGanttLayout(state: SimulationState): GanttLayout {
  const rows = state.orders.map((order) => computeRow(state, order));

  const days: number[] = [0, state.day];
  for (const order of state.orders) {
    days.push(order.orderedDay);
    if (order.status !== "取消済") days.push(order.dueDay);
    if (order.shippedDay !== undefined) days.push(order.shippedDay);
    if (order.cancelledDay !== undefined) days.push(order.cancelledDay);
  }
  const minDay = Math.min(...days);
  const maxDayRaw = Math.max(...days);
  const maxDay = maxDayRaw === minDay ? minDay + 1 : maxDayRaw;

  return { minDay, maxDay, todayDay: state.day, rows };
}
