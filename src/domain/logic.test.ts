// docs/design.md §9-1, §9-2 の通し演習をコードで再現し、logic.ts の挙動を検証する。
// 加えて §5（二重発注防止）・§7（取消ロジック）の単体テストも行う。
import { describe, expect, it } from "vitest";
import { ITEM_IDS } from "../data/masterData";
import type { SimulationState } from "../types";
import { createInitialState } from "./reducer";
import { advanceDay, cancelOrder, createOrder } from "./logic";

function advanceUntil(state: SimulationState, targetDay: number): void {
  while (state.day <= targetDay) {
    advanceDay(state);
  }
}

function wip(state: SimulationState, orderId: string, itemId: string) {
  return state.wipRecords.find((r) => r.orderId === orderId && r.itemId === itemId);
}

function fg(state: SimulationState, orderId: string, itemId: string) {
  return state.fgRecords.find((r) => r.orderId === orderId && r.itemId === itemId);
}

describe("§9-1 通し演習：クリティカルパス", () => {
  it("受注X（コンベア装置1台・納期D20）が設計書通りD20にオンタイムで出荷される", () => {
    const state = createInitialState();
    const orderX = createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 20,
    });

    // D0: 登録直後の1回目の advanceDay で、3階層すべてに引当を試行し不足分を発注する
    advanceDay(state);
    expect(state.day).toBe(1);
    const electronicsPo = state.purchaseOrders.find((po) => po.itemId === ITEM_IDS.ELECTRONICS);
    const steelPo = state.purchaseOrders.find((po) => po.itemId === ITEM_IDS.STEEL);
    const motorPo = state.purchaseOrders.find((po) => po.itemId === ITEM_IDS.MOTOR);
    const gearPo = state.purchaseOrders.find((po) => po.itemId === ITEM_IDS.GEAR);
    expect(electronicsPo?.quantity).toBe(3);
    expect(electronicsPo?.arrivalDay).toBe(4);
    expect(steelPo?.quantity).toBe(2);
    expect(steelPo?.arrivalDay).toBe(5);
    expect(motorPo?.quantity).toBe(1);
    expect(motorPo?.arrivalDay).toBe(10);
    expect(gearPo?.quantity).toBe(2);
    expect(gearPo?.arrivalDay).toBe(5);
    // 本体は3つの下位アセンブリが未完成のため引当不可
    expect(wip(state, orderX.orderId, ITEM_IDS.CONVEYOR)).toBeUndefined();

    // D4: 電装部品入荷 → 制御盤の引当成立（仕掛開始）。受注ステータスが引当中に遷移
    advanceUntil(state, 4);
    expect(state.day).toBe(5);
    expect(wip(state, orderX.orderId, ITEM_IDS.PANEL)?.startedDay).toBe(4);
    const refreshedOrder = state.orders.find((o) => o.orderId === orderX.orderId)!;
    expect(refreshedOrder.status).toBe("引当中");

    // D5: 鋼材・歯車入荷 → フレーム部の引当成立（駆動部はモーター未入荷のため成立しない）
    advanceUntil(state, 5);
    expect(state.day).toBe(6);
    expect(wip(state, orderX.orderId, ITEM_IDS.FRAME)?.startedDay).toBe(5);
    expect(wip(state, orderX.orderId, ITEM_IDS.DRIVE)).toBeUndefined();

    // D6: 制御盤の仕掛完成
    advanceUntil(state, 6);
    expect(fg(state, orderX.orderId, ITEM_IDS.PANEL)?.completedDay).toBe(6);

    // D8: フレーム部の仕掛完成
    advanceUntil(state, 8);
    expect(fg(state, orderX.orderId, ITEM_IDS.FRAME)?.completedDay).toBe(8);

    // D10: モーター入荷 → 駆動部の引当成立
    advanceUntil(state, 10);
    expect(wip(state, orderX.orderId, ITEM_IDS.DRIVE)?.startedDay).toBe(10);

    // D14: 駆動部の仕掛完成 → 3階層すべて揃い、本体の引当成立
    // （駆動部の完成品は同日中に本体の仕掛開始に消費されるため、完成品在庫としては残らない）
    advanceUntil(state, 14);
    expect(wip(state, orderX.orderId, ITEM_IDS.CONVEYOR)?.startedDay).toBe(14);

    // D16: 本体の仕掛完成。納期D20にはまだ早いため出荷待ち
    advanceUntil(state, 16);
    expect(fg(state, orderX.orderId, ITEM_IDS.CONVEYOR)?.completedDay).toBe(16);
    expect(state.orders.find((o) => o.orderId === orderX.orderId)!.status).toBe("引当中");

    // D20: 納期到来。出荷実行（オンタイム）
    advanceUntil(state, 20);
    const shipped = state.orders.find((o) => o.orderId === orderX.orderId)!;
    expect(shipped.status).toBe("出荷済");
    expect(shipped.shippedDay).toBe(20);
  });
});

describe("§9-2 通し演習：優先順位ルール（複数受注の競合）", () => {
  it("納期の早いZがモーターを優先的に確保し、Yより先に出荷される", () => {
    const state = createInitialState();
    const orderY = createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 2,
      amount: 2_000_000,
      dueDay: 25,
    });

    // D0: Y登録。モーター2個不足→発注（D10着）
    advanceDay(state);
    const firstMotorPo = state.purchaseOrders.find((po) => po.itemId === ITEM_IDS.MOTOR);
    expect(firstMotorPo?.quantity).toBe(2);
    expect(firstMotorPo?.arrivalDay).toBe(10);

    // D2: Z登録
    advanceUntil(state, 1);
    expect(state.day).toBe(2);
    const orderZ = createOrder(state, {
      customerId: "CUST-B",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 18,
    });

    // Yの未充足分(2)＋Zの必要分(1)＝合計3に対し、有効在庫0＋発注残2では不足→1個追加発注（D12着）
    advanceDay(state);
    const motorPos = state.purchaseOrders.filter((po) => po.itemId === ITEM_IDS.MOTOR);
    expect(motorPos).toHaveLength(2);
    expect(motorPos[1].quantity).toBe(1);
    expect(motorPos[1].arrivalDay).toBe(12);

    // D10: モーター2個入荷。納期が早いZが先に処理され1個を確保→駆動部仕掛開始。
    // 残り1個ではYの必要数(2)に届かず、Yは待機
    advanceUntil(state, 10);
    expect(wip(state, orderZ.orderId, ITEM_IDS.DRIVE)?.startedDay).toBe(10);
    expect(wip(state, orderY.orderId, ITEM_IDS.DRIVE)).toBeUndefined();

    // D12: 追加のモーター1個入荷。Yの2個が揃い、駆動部仕掛開始
    advanceUntil(state, 12);
    expect(wip(state, orderY.orderId, ITEM_IDS.DRIVE)?.startedDay).toBe(12);

    // D14: Zの駆動部仕掛完成（D10開始＋4日）。フレーム部・制御盤も既に完成しているため、
    // 駆動部の完成品は同日中に本体の仕掛開始に消費される
    advanceUntil(state, 14);
    expect(wip(state, orderZ.orderId, ITEM_IDS.CONVEYOR)?.startedDay).toBe(14);

    // D16: Yの駆動部仕掛完成（D12開始＋4日）→ 同日中に本体の仕掛開始
    advanceUntil(state, 16);
    expect(wip(state, orderY.orderId, ITEM_IDS.CONVEYOR)?.startedDay).toBe(16);

    // Z: 本体仕掛開始D14・完成D16、納期D18でオンタイム
    expect(fg(state, orderZ.orderId, ITEM_IDS.CONVEYOR)?.completedDay).toBe(16);
    // Y: 本体仕掛開始D16・完成D18、納期D25でオンタイム
    advanceUntil(state, 18);
    expect(fg(state, orderY.orderId, ITEM_IDS.CONVEYOR)?.completedDay).toBe(18);

    advanceUntil(state, 18);
    const shippedZ = state.orders.find((o) => o.orderId === orderZ.orderId)!;
    expect(shippedZ.status).toBe("出荷済");
    expect(shippedZ.shippedDay).toBe(18);

    advanceUntil(state, 25);
    const shippedY = state.orders.find((o) => o.orderId === orderY.orderId)!;
    expect(shippedY.status).toBe("出荷済");
    expect(shippedY.shippedDay).toBe(25);
  });
});

describe("§7 取消ロジック", () => {
  it("受注済（引当成立前）は取消でき、在庫に影響を与えない", () => {
    const state = createInitialState();
    const order = createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 20,
    });
    const stocksBefore = JSON.stringify(state.materialStocks);

    cancelOrder(state, order.orderId);

    const cancelled = state.orders.find((o) => o.orderId === order.orderId)!;
    expect(cancelled.status).toBe("取消済");
    expect(cancelled.cancelledDay).toBe(0);
    expect(JSON.stringify(state.materialStocks)).toBe(stocksBefore);
  });

  it("引当中（仕掛開始後）の受注は取消できない", () => {
    const state = createInitialState();
    const order = createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 20,
    });
    advanceUntil(state, 4); // D4で制御盤が引当成立し、受注ステータスが引当中になる
    const before = state.orders.find((o) => o.orderId === order.orderId)!;
    expect(before.status).toBe("引当中");

    cancelOrder(state, order.orderId);

    const after = state.orders.find((o) => o.orderId === order.orderId)!;
    expect(after.status).toBe("引当中");
  });
});

describe("§5 二重発注防止", () => {
  it("既に発注残がある場合、不足分のみを追加発注する（同一材料を複数受注が取り合うケース）", () => {
    const state = createInitialState();
    createOrder(state, {
      customerId: "CUST-A",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 2,
      amount: 2_000_000,
      dueDay: 25,
    });
    advanceDay(state); // D0処理：モーター2個発注
    createOrder(state, {
      customerId: "CUST-B",
      productItemId: ITEM_IDS.CONVEYOR,
      quantity: 1,
      amount: 1_000_000,
      dueDay: 18,
    });
    advanceDay(state); // D1処理：まだ新規受注の引当試行は行われるが、Zの受注はD2に登録されるのでここでは影響なし

    const motorPos = state.purchaseOrders.filter((po) => po.itemId === ITEM_IDS.MOTOR);
    const totalOrdered = motorPos.reduce((sum, po) => sum + po.quantity, 0);
    // Y(2台→モーター2個)+Z(1台→モーター1個)の合計3個を超えて発注していないこと
    expect(totalOrdered).toBe(3);
  });
});
