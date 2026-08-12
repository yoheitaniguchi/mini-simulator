// docs/design.md §18（受注一覧ガントチャート）の表現ルールの検証
import { describe, expect, it } from "vitest";
import { ITEM_IDS } from "../data/masterData";
import { advanceDay, cancelOrder, createOrder } from "./logic";
import { computeGanttLayout } from "./gantt";
import { createInitialState } from "./reducer";

describe("computeGanttLayout", () => {
  it("受注済（待機中）はグレー1区間、登録日から今日まで", () => {
    const state = createInitialState();
    createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 20,
    });
    advanceDay(state); // D0を処理。まだ制御盤は仕掛開始していない

    const layout = computeGanttLayout(state);
    const row = layout.rows[0];
    expect(row.segments).toEqual([{ from: 0, to: 1, kind: "waiting" }]);
    expect(row.endMarker).toBeUndefined();
    expect(row.dueDay).toBe(20);
    expect(row.dimmed).toBe(false);
  });

  it("引当中はグレー区間＋ティール区間、登録日から今日まで", () => {
    const state = createInitialState();
    createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 20,
    });
    while (state.day <= 4) advanceDay(state); // D4で制御盤の引当成立

    const layout = computeGanttLayout(state);
    const row = layout.rows[0];
    expect(row.segments).toEqual([
      { from: 0, to: 4, kind: "waiting" },
      { from: 4, to: 5, kind: "in-progress" },
    ]);
  });

  it("出荷済はグレー＋ティール、登録日から出荷日まで。終端マーカーはshipped", () => {
    const state = createInitialState();
    createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 20,
    });
    while (state.day <= 20) advanceDay(state); // D20で出荷

    const layout = computeGanttLayout(state);
    const row = layout.rows[0];
    expect(row.segments).toEqual([
      { from: 0, to: 4, kind: "waiting" },
      { from: 4, to: 20, kind: "in-progress" },
    ]);
    expect(row.endMarker).toEqual({ day: 20, kind: "shipped" });
  });

  it("取消済はグレー1区間（不透明度を下げる）、登録日から取消日まで。納期は表示しない", () => {
    const state = createInitialState();
    const order = createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 20,
    });
    advanceDay(state);
    advanceDay(state);
    cancelOrder(state, order.orderId);

    const layout = computeGanttLayout(state);
    const row = layout.rows[0];
    expect(row.segments).toEqual([{ from: 0, to: 2, kind: "waiting" }]);
    expect(row.endMarker).toEqual({ day: 2, kind: "cancelled" });
    expect(row.dueDay).toBeUndefined();
    expect(row.dimmed).toBe(true);
  });

  it("x軸の範囲は全受注の登録日〜納期と今日の範囲に応じて自動的にスケールする", () => {
    const state = createInitialState();
    createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 2,
      amount: 2_000_000,
      dueDay: 25,
    });
    advanceDay(state);
    createOrder(state, {
      customerId: "CUST-B",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 18,
    });

    const layout = computeGanttLayout(state);
    expect(layout.minDay).toBe(0);
    expect(layout.maxDay).toBe(25); // 一番遅い納期
    expect(layout.todayDay).toBe(state.day);
  });
});
