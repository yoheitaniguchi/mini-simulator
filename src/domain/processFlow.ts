// 受注〜出荷プロセス図（BPMN風）用の表示データを計算する純粋関数。
// ドメイン一覧・データの流れは design.md §2 のIPO表に基づく。
// 「本日どのモノ・データが動いたか」の判定は、advanceDay() が積んだ eventLog（直前に処理した日＝
// state.day - 1 の分）と、受注の firstAllocatedDay から機械的に求める。UI側で個別に状態を辿らない。
import type { SimulationState } from "../types";

export type DomainId = "order" | "master" | "procurement" | "inventory" | "production" | "shipment";

export const DOMAIN_LABELS: Record<DomainId, string> = {
  order: "受注",
  master: "マスタ",
  procurement: "調達",
  inventory: "在庫",
  production: "生産",
  shipment: "出荷",
};

export interface FlowDef {
  id: string;
  from: DomainId;
  to: DomainId;
  /** 線上に表示するラベル（design.md §2のIPO表のOutput／Inputを言葉にしたもの） */
  label: string;
}

/** design.md §2 のIPO表から導いたドメイン間のメッセージフロー（データ／モノの受け渡し）一覧 */
export const FLOWS: FlowDef[] = [
  { id: "order-production", from: "order", to: "production", label: "受注データ（引当対象・納期順）" },
  { id: "production-order", from: "production", to: "order", label: "ステータス更新（引当中）" },
  { id: "order-shipment", from: "order", to: "shipment", label: "受注データ（納期）" },
  { id: "shipment-order", from: "shipment", to: "order", label: "ステータス更新（出荷済）" },
  { id: "master-procurement", from: "master", to: "procurement", label: "品目マスタ" },
  { id: "master-production", from: "master", to: "production", label: "品目マスタ・BOM" },
  { id: "production-procurement", from: "production", to: "procurement", label: "不足数量" },
  { id: "procurement-inventory", from: "procurement", to: "inventory", label: "入荷実績（材料）" },
  { id: "production-inventory", from: "production", to: "inventory", label: "消費／仕掛／完成実績" },
  { id: "inventory-production", from: "inventory", to: "production", label: "材料在庫残高" },
  { id: "shipment-inventory", from: "shipment", to: "inventory", label: "出庫実績" },
  { id: "inventory-shipment", from: "inventory", to: "shipment", label: "完成品在庫（受注別）" },
];

export interface ActiveFlows {
  /** 直前に処理された日。まだ一度も「次の日へ進む」を実行していない（D0未処理）ならnull */
  lastDay: number | null;
  flowIds: Set<string>;
}

/**
 * 「本日（＝直前に処理された日）動いたモノ・データの流れ」を判定する。
 * advanceDay() は state.day を処理してから日付をD+1進めるため（logic.tsのadvanceDay参照）、
 * 直前に処理された日は state.day - 1 になる。
 */
export function computeActiveFlows(state: SimulationState): ActiveFlows {
  const lastDay = state.day - 1;
  const flowIds = new Set<string>();
  if (lastDay < 0) return { lastDay: null, flowIds };

  for (const entry of state.eventLog) {
    if (entry.day !== lastDay) continue;
    switch (entry.step) {
      case "procurement-arrival":
        flowIds.add("procurement-inventory");
        break;
      case "production-complete":
        flowIds.add("production-inventory");
        break;
      case "production-allocate":
        if (entry.message.includes("発注")) {
          flowIds.add("master-procurement");
          flowIds.add("production-procurement");
        } else if (entry.message.includes("仕掛開始")) {
          flowIds.add("order-production");
          flowIds.add("master-production");
          flowIds.add("inventory-production");
          flowIds.add("production-inventory");
        }
        break;
      case "shipment":
        flowIds.add("order-shipment");
        flowIds.add("inventory-shipment");
        flowIds.add("shipment-inventory");
        flowIds.add("shipment-order");
        break;
    }
  }

  // 「仕掛開始」ログはBOM階層ごとに複数回起こり得るが、受注ステータスが
  // 受注済→引当中に遷移するのは最初の1回だけなので、firstAllocatedDayで別途判定する。
  for (const order of state.orders) {
    if (order.firstAllocatedDay === lastDay) {
      flowIds.add("production-order");
    }
  }

  return { lastDay, flowIds };
}

export function computeActiveDomains(flowIds: Set<string>): Set<DomainId> {
  const domains = new Set<DomainId>();
  for (const flow of FLOWS) {
    if (flowIds.has(flow.id)) {
      domains.add(flow.from);
      domains.add(flow.to);
    }
  }
  return domains;
}
