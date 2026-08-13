// simulationReducer（useReducer用、docs/design.md §12）の検証。
// logic.ts側の業務ロジックはlogic.test.ts等で検証済みのため、ここではreducer固有の関心事のみ扱う：
// 各actionが対応するlogic.ts関数へ正しく委譲されること、状態を直接書き換えず新しいstateを返すこと
// （structuredCloneしてからlogic.tsへ渡す設計、CLAUDE.md参照）、未知のactionは状態をそのまま返すこと。
import { describe, expect, it } from "vitest";
import { ITEM_IDS } from "../data/masterData";
import type { SimulationAction } from "./reducer";
import { createInitialState, simulationReducer } from "./reducer";

describe("simulationReducer", () => {
  it("ORDER_CREATE：受注を追加し、元のstateは変更しない", () => {
    const state = createInitialState();
    const next = simulationReducer(state, {
      type: "ORDER_CREATE",
      payload: {
        customerId: "CUST-A",
        productItemId: ITEM_IDS.CONVEYOR,
        quantity: 1,
        amount: 1_000_000,
        dueDay: 20,
      },
    });

    expect(state.orders).toHaveLength(0);
    expect(next.orders).toHaveLength(1);
    expect(next).not.toBe(state);
  });

  it("ORDER_CANCEL：受注済の受注を取消済にする", () => {
    let state = createInitialState();
    state = simulationReducer(state, {
      type: "ORDER_CREATE",
      payload: {
        customerId: "CUST-A",
        productItemId: ITEM_IDS.CONVEYOR,
        quantity: 1,
        amount: 1_000_000,
        dueDay: 20,
      },
    });
    const orderId = state.orders[0].orderId;

    const next = simulationReducer(state, { type: "ORDER_CANCEL", payload: { orderId } });

    expect(next.orders[0].status).toBe("取消済");
  });

  it("ADVANCE_DAY：日付を1日進める", () => {
    const state = createInitialState();
    const next = simulationReducer(state, { type: "ADVANCE_DAY" });

    expect(state.day).toBe(0);
    expect(next.day).toBe(1);
  });

  it("RESET：初期状態に戻す（既存stateへの参照は無視する）", () => {
    let state = createInitialState();
    state = simulationReducer(state, { type: "ADVANCE_DAY" });
    expect(state.day).toBe(1);

    const next = simulationReducer(state, { type: "RESET" });

    expect(next.day).toBe(0);
    expect(next.orders).toEqual([]);
  });

  it("MASTER_UPDATE_ITEM_LEAD_TIME：品目の標準リードタイムを更新する", () => {
    const state = createInitialState();
    const next = simulationReducer(state, {
      type: "MASTER_UPDATE_ITEM_LEAD_TIME",
      payload: { itemId: ITEM_IDS.MOTOR, leadTimeDays: 3 },
    });

    expect(next.items.find((i) => i.itemId === ITEM_IDS.MOTOR)?.leadTimeDays).toBe(3);
    expect(state.items.find((i) => i.itemId === ITEM_IDS.MOTOR)?.leadTimeDays).toBe(10);
  });

  it("MASTER_UPDATE_BOM_QUANTITY：BOMの員数を更新する", () => {
    const state = createInitialState();
    const next = simulationReducer(state, {
      type: "MASTER_UPDATE_BOM_QUANTITY",
      payload: { parentItemId: ITEM_IDS.DRIVE, childItemId: ITEM_IDS.MOTOR, quantityPer: 2 },
    });

    const line = next.bom.find(
      (l) => l.parentItemId === ITEM_IDS.DRIVE && l.childItemId === ITEM_IDS.MOTOR,
    );
    expect(line?.quantityPer).toBe(2);
  });

  it("MASTER_UPDATE_CUSTOMER_NAME：得意先名称を更新する", () => {
    const state = createInitialState();
    const next = simulationReducer(state, {
      type: "MASTER_UPDATE_CUSTOMER_NAME",
      payload: { customerId: "CUST-A", name: "新しい得意先名" },
    });

    expect(next.customers.find((c) => c.customerId === "CUST-A")?.name).toBe("新しい得意先名");
  });

  it("MASTER_UPDATE_SUPPLIER_NAME：仕入先名称を更新する", () => {
    const state = createInitialState();
    const next = simulationReducer(state, {
      type: "MASTER_UPDATE_SUPPLIER_NAME",
      payload: { supplierId: "SUP-MOTOR", name: "新しい仕入先名" },
    });

    expect(next.suppliers.find((s) => s.supplierId === "SUP-MOTOR")?.name).toBe("新しい仕入先名");
  });

  it("未知のactionはstateをそのまま返す", () => {
    const state = createInitialState();
    const unknown = { type: "UNKNOWN_ACTION" } as unknown as SimulationAction;

    const next = simulationReducer(state, unknown);

    expect(next).toBe(state);
  });
});
