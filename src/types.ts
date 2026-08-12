// ドメインの型定義（docs/design.md §2, §4, §16 に基づく）

export type ItemCategory = "make" | "buy"; // 内製 / 購買

export interface ItemMaster {
  itemId: string;
  name: string;
  category: ItemCategory;
  /** 標準リードタイム（日数）。内製なら生産、購買なら調達のリードタイムとして扱う */
  leadTimeDays: number;
}

/** BOMの親子関係。1行 = 親品目1つに対する子品目1つとその員数 */
export interface BomLine {
  parentItemId: string;
  childItemId: string;
  quantityPer: number; // 員数
}

export interface Customer {
  customerId: string;
  name: string;
}

export interface Supplier {
  supplierId: string;
  name: string;
}

export type OrderStatus = "受注済" | "引当中" | "出荷済" | "取消済";

export interface Order {
  orderId: string;
  customerId: string;
  /** 受注対象の完成品品目（BOMのルート） */
  productItemId: string;
  quantity: number;
  amount: number;
  /** 納期（D0からの経過日数） */
  dueDay: number;
  /** 登録日（D0からの経過日数） */
  orderedDay: number;
  status: OrderStatus;
  shippedDay?: number;
  cancelledDay?: number;
}

/**
 * 仕掛品在庫。受注ごと・BOM階層（品目）ごとに1レコード（ペギング、二値判定）。
 * 内製品のみが持つ。購買品は在庫（MaterialStock）で直接管理する。
 */
export interface WipRecord {
  orderId: string;
  itemId: string;
  startedDay: number;
  /** startedDay + その時点のリードタイム（仕掛開始時点のマスタ値を焼き付け済み） */
  completeDay: number;
}

/**
 * 完成品在庫。受注ごと・BOM階層（品目）ごとに1レコード（ペギング、二値判定）。
 */
export interface FgRecord {
  orderId: string;
  itemId: string;
  completedDay: number;
}

export interface PurchaseOrder {
  poId: string;
  itemId: string;
  quantity: number;
  orderedDay: number;
  arrivalDay: number;
  arrived: boolean;
}

/** 材料在庫。品目（購買品）ごとに数量で合算管理 */
export interface MaterialStock {
  itemId: string;
  quantity: number;
}

export type SimulationStep =
  | "procurement-arrival"
  | "production-complete"
  | "production-allocate"
  | "shipment";

export interface EventLogEntry {
  day: number;
  step: SimulationStep;
  message: string;
}

export interface SimulationState {
  day: number;
  orders: Order[];
  wipRecords: WipRecord[];
  fgRecords: FgRecord[];
  purchaseOrders: PurchaseOrder[];
  materialStocks: MaterialStock[];
  items: ItemMaster[];
  bom: BomLine[];
  customers: Customer[];
  suppliers: Supplier[];
  eventLog: EventLogEntry[];
  nextOrderSeq: number;
  nextPoSeq: number;
}

export interface CreateOrderInput {
  customerId: string;
  productItemId: string;
  quantity: number;
  amount: number;
  dueDay: number;
}
