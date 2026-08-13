// ドメインロジック本体（docs/design.md §4〜§8, §16）
//
// この層の関数群は、呼び出し側（reducer.ts）が渡した SimulationState を直接書き換える。
// reducer.ts 側で structuredClone してから渡す設計のため、この層の外側（UI等）からは
// 純粋関数として扱ってよい（CLAUDE.md参照）。
import type {
  BomLine,
  CreateOrderInput,
  EventLogEntry,
  ItemMaster,
  Order,
  SimulationState,
  SimulationStep,
} from "../types";

function pushLog(state: SimulationState, step: SimulationStep, message: string): void {
  const entry: EventLogEntry = { day: state.day, step, message };
  state.eventLog.push(entry);
}

function getItem(state: SimulationState, itemId: string): ItemMaster {
  const item = state.items.find((i) => i.itemId === itemId);
  if (!item) throw new Error(`item not found: ${itemId}`);
  return item;
}

function itemName(state: SimulationState, itemId: string): string {
  return getItem(state, itemId).name;
}

function bomChildrenOf(state: SimulationState, parentItemId: string): BomLine[] {
  return state.bom.filter((line) => line.parentItemId === parentItemId);
}

function hasFg(state: SimulationState, orderId: string, itemId: string): boolean {
  return state.fgRecords.some((r) => r.orderId === orderId && r.itemId === itemId);
}

function hasWip(state: SimulationState, orderId: string, itemId: string): boolean {
  return state.wipRecords.some((r) => r.orderId === orderId && r.itemId === itemId);
}

function removeFgRecord(state: SimulationState, orderId: string, itemId: string): void {
  state.fgRecords = state.fgRecords.filter((r) => !(r.orderId === orderId && r.itemId === itemId));
}

function materialStockQty(state: SimulationState, itemId: string): number {
  return state.materialStocks.find((s) => s.itemId === itemId)?.quantity ?? 0;
}

function addMaterialStock(state: SimulationState, itemId: string, delta: number): void {
  const stock = state.materialStocks.find((s) => s.itemId === itemId);
  if (stock) {
    stock.quantity += delta;
  } else {
    state.materialStocks.push({ itemId, quantity: delta });
  }
}

function outstandingPoQty(state: SimulationState, itemId: string): number {
  return state.purchaseOrders
    .filter((po) => po.itemId === itemId && !po.arrived)
    .reduce((sum, po) => sum + po.quantity, 0);
}

function isOrderActive(order: Order): boolean {
  return order.status === "受注済" || order.status === "引当中";
}

/** まだ出荷（または取消）が完了していない受注が1件でもあるか（自動再生の終了判定に使用） */
export function hasUnfinishedOrders(state: SimulationState): boolean {
  return state.orders.some(isOrderActive);
}

/**
 * 指定した受注について、まだ消費されていない（WIP/FGレコードが存在しない）購買品の
 * 必要数量を、BOMを再帰的に辿って集計する（§5の「未充足の全受注の所要数合計」算出に使用）。
 */
function computeRequiredTree(
  state: SimulationState,
  order: Order,
  itemId: string,
  multiplier: number,
  acc: Record<string, number> = {},
): Record<string, number> {
  if (hasFg(state, order.orderId, itemId) || hasWip(state, order.orderId, itemId)) {
    // 既に消費済み／仕掛中のため、これ以上の所要は発生しない
    return acc;
  }
  const item = getItem(state, itemId);
  if (item.category === "buy") {
    acc[itemId] = (acc[itemId] ?? 0) + multiplier;
    return acc;
  }
  for (const line of bomChildrenOf(state, itemId)) {
    computeRequiredTree(state, order, line.childItemId, multiplier * line.quantityPer, acc);
  }
  return acc;
}

function totalUnfulfilledRequirement(state: SimulationState, materialItemId: string): number {
  let total = 0;
  for (const order of state.orders) {
    if (!isOrderActive(order)) continue;
    const acc = computeRequiredTree(state, order, order.productItemId, order.quantity);
    total += acc[materialItemId] ?? 0;
  }
  return total;
}

/**
 * §5 発注要否判定：有効在庫＋発注残 ≥ 未充足の全受注の所要数合計。
 * 不足している場合のみ、その不足分だけを新規発注する。
 */
function checkAndPlaceProcurement(state: SimulationState, itemId: string, day: number): void {
  const required = totalUnfulfilledRequirement(state, itemId);
  const available = materialStockQty(state, itemId) + outstandingPoQty(state, itemId);
  const shortfall = required - available;
  if (shortfall <= 0) return;

  const item = getItem(state, itemId);
  const poId = `PO-${state.nextPoSeq++}`;
  const arrivalDay = day + item.leadTimeDays;
  state.purchaseOrders.push({
    poId,
    itemId,
    quantity: shortfall,
    orderedDay: day,
    arrivalDay,
    arrived: false,
  });
  pushLog(
    state,
    "production-allocate",
    `${itemName(state, itemId)} を ${shortfall} 個発注（入荷予定 D${arrivalDay}）`,
  );
}

/**
 * 内製品ノードを再帰的に辿り、仕掛開始できるか判定・実行する（§16）。
 * 直下の構成品が購買品なら材料在庫を、内製品ならFGレコードの有無を確認する。
 * 揃っていなければ、購買品側は調達への発注要求を、内製品側はさらに下位への再帰呼び出しを行う。
 */
function attemptAllocate(
  state: SimulationState,
  order: Order,
  itemId: string,
  multiplier: number,
  day: number,
): void {
  if (hasFg(state, order.orderId, itemId) || hasWip(state, order.orderId, itemId)) {
    return; // 完成済み or 仕掛中のため、これ以上の処理は不要
  }

  const children = bomChildrenOf(state, itemId);
  let allReady = true;

  for (const line of children) {
    const childItem = getItem(state, line.childItemId);
    const childQty = multiplier * line.quantityPer;
    if (childItem.category === "buy") {
      if (materialStockQty(state, line.childItemId) < childQty) {
        allReady = false;
        checkAndPlaceProcurement(state, line.childItemId, day);
      }
    } else {
      attemptAllocate(state, order, line.childItemId, childQty, day);
      if (!hasFg(state, order.orderId, line.childItemId)) {
        allReady = false;
      }
    }
  }

  if (!allReady) return;

  // 構成品を消費して仕掛開始
  for (const line of children) {
    const childItem = getItem(state, line.childItemId);
    const childQty = multiplier * line.quantityPer;
    if (childItem.category === "buy") {
      addMaterialStock(state, line.childItemId, -childQty);
    } else {
      removeFgRecord(state, order.orderId, line.childItemId);
    }
  }

  const leadTimeDays = getItem(state, itemId).leadTimeDays;
  state.wipRecords.push({
    orderId: order.orderId,
    itemId,
    startedDay: day,
    completeDay: day + leadTimeDays,
  });

  if (order.status === "受注済") {
    order.status = "引当中";
    order.firstAllocatedDay = day;
  }

  pushLog(state, "production-allocate", `${itemName(state, itemId)} の仕掛開始（受注 ${order.orderId}）`);
}

/** §1 入荷判定：発注日からリードタイムが経過した発注済み材料を材料在庫に計上する */
function processProcurementArrival(state: SimulationState, day: number): void {
  for (const po of state.purchaseOrders) {
    if (po.arrived) continue;
    if (po.arrivalDay > day) continue;
    po.arrived = true;
    addMaterialStock(state, po.itemId, po.quantity);
    pushLog(
      state,
      "procurement-arrival",
      `${itemName(state, po.itemId)} が ${po.quantity} 個入荷`,
    );
  }
}

/** §2 仕掛→完成の判定：仕掛開始からリードタイムが経過した仕掛品を完成品在庫に切り替える */
function processProductionComplete(state: SimulationState, day: number): void {
  const completed = state.wipRecords.filter((r) => r.completeDay <= day);
  for (const record of completed) {
    state.fgRecords.push({
      orderId: record.orderId,
      itemId: record.itemId,
      completedDay: day,
    });
    pushLog(
      state,
      "production-complete",
      `${itemName(state, record.itemId)} が仕掛完成（受注 ${record.orderId}）`,
    );
  }
  state.wipRecords = state.wipRecords.filter((r) => r.completeDay > day);
}

/** §3 新規の材料引当を試行：受注済／引当中の受注を納期昇順に見て、材料引当を試みる */
function processProductionAllocate(state: SimulationState, day: number): void {
  const targets = state.orders
    .filter(isOrderActive)
    .slice()
    .sort((a, b) => a.dueDay - b.dueDay || a.orderedDay - b.orderedDay);
  for (const order of targets) {
    attemptAllocate(state, order, order.productItemId, order.quantity, day);
  }
}

/** §4 出荷可否判定・実行：完成品在庫があり納期が到来している受注を、納期昇順で出荷する */
function processShipment(state: SimulationState, day: number): void {
  const shippable = state.orders
    .filter((order) => order.status === "引当中" && day >= order.dueDay)
    .filter((order) => hasFg(state, order.orderId, order.productItemId))
    .slice()
    .sort((a, b) => a.dueDay - b.dueDay || a.orderedDay - b.orderedDay);

  for (const order of shippable) {
    order.status = "出荷済";
    order.shippedDay = day;
    const onTime = day <= order.dueDay;
    pushLog(
      state,
      "shipment",
      `受注 ${order.orderId} を出荷（納期D${order.dueDay} / ${onTime ? "オンタイム" : "遅延"}）`,
    );
  }
}

/**
 * §8 1日の処理順序。
 *
 * 実装上の注意（design.mdとの差分）：design.md §8の文面は「1. 日付をD+1進める」を
 * 最初のステップとして記載しているが、これを文字通り実装すると§9-1・§9-2の演習の
 * 日数表（発注の入荷予定日・仕掛完成日など）と1日分ずれる。実際に演習の数字を手で
 * 検証したところ、「現在の日（state.day）を処理してから、次回呼び出しに備えて日付を
 * D+1進める」という順序でなければ表と一致しないことを確認した。
 * 例：受注登録直後の1回目の「次の日へ進む」で発生する発注の入荷予定日が
 * 「登録日＋リードタイム」（§9-1ではD0+4=D4）になるためには、その1回目の呼び出しが
 * 登録日そのもの（D0）を処理する必要がある。
 * そのため本実装では、state.dayは「まだ処理されていない今日」を表す値とし、
 * advanceDay()はその日を処理した後に日付を進める。
 */
export function advanceDay(state: SimulationState): void {
  const day = state.day;
  processProcurementArrival(state, day);
  processProductionComplete(state, day);
  processProductionAllocate(state, day);
  processShipment(state, day);
  state.day += 1;
}

/** 受注登録。登録した瞬間は評価されず、次のADVANCE_DAYで初めて処理対象になる */
export function createOrder(state: SimulationState, input: CreateOrderInput): Order {
  const order: Order = {
    orderId: `ORDER-${state.nextOrderSeq++}`,
    customerId: input.customerId,
    productItemId: input.productItemId,
    quantity: input.quantity,
    amount: input.amount,
    dueDay: input.dueDay,
    orderedDay: state.day,
    status: "受注済",
  };
  state.orders.push(order);
  return order;
}

/**
 * §7 取消：受注済（材料引当成立前）のときのみ可能。在庫への影響はない
 * （仕掛開始時に材料を一括消費する設計のため、受注済の時点では何も消費していない）。
 */
export function cancelOrder(state: SimulationState, orderId: string): void {
  const order = state.orders.find((o) => o.orderId === orderId);
  if (!order) return;
  if (order.status !== "受注済") return;
  order.status = "取消済";
  order.cancelledDay = state.day;
}

/** §14 マスタ編集：品目の標準リードタイム（編集可。区分・BOM構造は編集不可） */
export function updateItemLeadTime(
  state: SimulationState,
  itemId: string,
  leadTimeDays: number,
): void {
  if (!Number.isFinite(leadTimeDays) || leadTimeDays <= 0) return;
  const item = state.items.find((i) => i.itemId === itemId);
  if (!item) return;
  item.leadTimeDays = leadTimeDays;
}

/** §14 マスタ編集：BOMの員数（編集可。構成品目の追加・削除は編集不可） */
export function updateBomQuantity(
  state: SimulationState,
  parentItemId: string,
  childItemId: string,
  quantityPer: number,
): void {
  if (!Number.isFinite(quantityPer) || quantityPer <= 0) return;
  const line = state.bom.find(
    (l) => l.parentItemId === parentItemId && l.childItemId === childItemId,
  );
  if (!line) return;
  line.quantityPer = quantityPer;
}

/** §14 マスタ編集：得意先名称（編集可。新規追加は編集不可） */
export function updateCustomerName(state: SimulationState, customerId: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const customer = state.customers.find((c) => c.customerId === customerId);
  if (!customer) return;
  customer.name = trimmed;
}

/** §14 マスタ編集：仕入先名称（編集可。新規追加は編集不可） */
export function updateSupplierName(state: SimulationState, supplierId: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const supplier = state.suppliers.find((s) => s.supplierId === supplierId);
  if (!supplier) return;
  supplier.name = trimmed;
}

interface BottleneckCandidate {
  label: string;
  /** 比較用の基準日。大きいほど後（＝クリティカルパス上でより律速）とみなす */
  etaDay: number;
}

function findBottleneck(
  state: SimulationState,
  order: Order,
  itemId: string,
  multiplier: number,
): BottleneckCandidate[] {
  if (hasFg(state, order.orderId, itemId)) return [];
  if (hasWip(state, order.orderId, itemId)) {
    const record = state.wipRecords.find(
      (r) => r.orderId === order.orderId && r.itemId === itemId,
    )!;
    return [{ label: `${itemName(state, itemId)} 仕掛中`, etaDay: record.completeDay }];
  }

  const candidates: BottleneckCandidate[] = [];
  for (const line of bomChildrenOf(state, itemId)) {
    const childItem = getItem(state, line.childItemId);
    const childQty = multiplier * line.quantityPer;
    if (childItem.category === "buy") {
      if (materialStockQty(state, line.childItemId) < childQty) {
        const outstanding = state.purchaseOrders
          .filter((po) => po.itemId === line.childItemId && !po.arrived)
          .sort((a, b) => b.arrivalDay - a.arrivalDay)[0];
        const etaDay = outstanding?.arrivalDay ?? Number.POSITIVE_INFINITY;
        const etaLabel = outstanding ? `（D${outstanding.arrivalDay}着予定）` : "";
        candidates.push({ label: `${itemName(state, line.childItemId)}入荷待ち${etaLabel}`, etaDay });
      }
    } else {
      candidates.push(...findBottleneck(state, order, line.childItemId, childQty));
    }
  }
  return candidates;
}

/**
 * §18 ガントチャートの「今日位置のラベル」用：受注の現在の状況を1行で表す文言を返す。
 * BOMツリー全体を走査し、最も入荷・完成が遅い（＝クリティカルパス上の律速工程となる）
 * 候補を採用する（design.md §9-1のモーターの例のような、律速工程が体感できる表示にするため）。
 */
export function describeOrderActivity(state: SimulationState, order: Order): string {
  if (order.status === "出荷済") return "出荷済";
  if (order.status === "取消済") return `取消済（D${order.cancelledDay}）`;
  // 本体（productItemId）が既に完成品在庫にある＝引当・生産は完了済みで、納期到来を待つのみ
  // （design.md §9-1 D16「本体の仕掛完成…納期D20にはまだ早いため出荷待ち」の表現に合わせる）
  if (hasFg(state, order.orderId, order.productItemId)) return "出荷待ち";

  const candidates = findBottleneck(state, order, order.productItemId, order.quantity);
  if (candidates.length === 0) {
    return "引当待ち";
  }
  candidates.sort((a, b) => b.etaDay - a.etaDay);
  return candidates[0].label;
}
