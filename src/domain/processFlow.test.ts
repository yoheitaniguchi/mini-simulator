// プロセス図（BPMN風）の「本日動いた流れ」判定ロジックの検証
import { describe, expect, it } from "vitest";
import { ITEM_IDS } from "../data/masterData";
import { advanceDay, createOrder } from "./logic";
import { computeActiveDomains, computeActiveFlows } from "./processFlow";
import { createInitialState } from "./reducer";

function flowIdList(state: ReturnType<typeof createInitialState>) {
  return [...computeActiveFlows(state).flowIds].sort();
}

describe("computeActiveFlows", () => {
  it("D0を一度も処理していない間はlastDayがnullで、流れも空", () => {
    const state = createInitialState();
    createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 20,
    });

    const active = computeActiveFlows(state);
    expect(active.lastDay).toBeNull();
    expect(active.flowIds.size).toBe(0);
  });

  it("D0処理直後：材料不足を検知して発注のみ発生（マスタ→調達／生産→調達）", () => {
    const state = createInitialState();
    createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 20,
    });
    advanceDay(state); // D0を処理

    const active = computeActiveFlows(state);
    expect(active.lastDay).toBe(0);
    expect(flowIdList(state)).toEqual(["master-procurement", "production-procurement"]);
  });

  it("D4処理直後：電装部品入荷＋制御盤の仕掛開始（受注ステータス更新も含む）", () => {
    const state = createInitialState();
    createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 20,
    });
    while (state.day <= 4) advanceDay(state); // D4で制御盤の引当成立（gantt.test.tsと同じ前提）

    const active = computeActiveFlows(state);
    expect(active.lastDay).toBe(4);
    expect(flowIdList(state)).toEqual(
      [
        "inventory-production",
        "master-production",
        "order-production",
        "procurement-inventory",
        "production-inventory",
        "production-order",
      ].sort(),
    );
  });
});

describe("computeActiveDomains", () => {
  it("流れに登場するfrom/toドメインの集合を返す", () => {
    const domains = computeActiveDomains(new Set(["order-production", "shipment-inventory"]));
    expect(domains).toEqual(new Set(["order", "production", "shipment", "inventory"]));
  });

  it("空集合を渡せば空集合を返す", () => {
    expect(computeActiveDomains(new Set())).toEqual(new Set());
  });
});
