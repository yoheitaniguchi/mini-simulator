// 初期マスタデータ（docs/design.md §17：小型コンベア装置）
import type { BomLine, Customer, ItemMaster, Supplier } from "../types";

export const ITEM_IDS = {
  CONVEYOR: "CONVEYOR",
  FRAME: "FRAME",
  DRIVE: "DRIVE",
  PANEL: "PANEL",
  STEEL: "STEEL",
  MOTOR: "MOTOR",
  GEAR: "GEAR",
  ELECTRONICS: "ELECTRONICS",
} as const;

export const initialItems: ItemMaster[] = [
  { itemId: ITEM_IDS.CONVEYOR, name: "コンベア装置", category: "make", leadTimeDays: 2 },
  { itemId: ITEM_IDS.FRAME, name: "フレーム部", category: "make", leadTimeDays: 3 },
  { itemId: ITEM_IDS.DRIVE, name: "駆動部", category: "make", leadTimeDays: 4 },
  { itemId: ITEM_IDS.PANEL, name: "制御盤", category: "make", leadTimeDays: 2 },
  { itemId: ITEM_IDS.STEEL, name: "鋼材", category: "buy", leadTimeDays: 5 },
  { itemId: ITEM_IDS.MOTOR, name: "モーター", category: "buy", leadTimeDays: 10 },
  { itemId: ITEM_IDS.GEAR, name: "歯車", category: "buy", leadTimeDays: 5 },
  { itemId: ITEM_IDS.ELECTRONICS, name: "電装部品", category: "buy", leadTimeDays: 4 },
];

export const initialBom: BomLine[] = [
  { parentItemId: ITEM_IDS.CONVEYOR, childItemId: ITEM_IDS.FRAME, quantityPer: 1 },
  { parentItemId: ITEM_IDS.CONVEYOR, childItemId: ITEM_IDS.DRIVE, quantityPer: 1 },
  { parentItemId: ITEM_IDS.CONVEYOR, childItemId: ITEM_IDS.PANEL, quantityPer: 1 },
  { parentItemId: ITEM_IDS.FRAME, childItemId: ITEM_IDS.STEEL, quantityPer: 2 },
  { parentItemId: ITEM_IDS.DRIVE, childItemId: ITEM_IDS.MOTOR, quantityPer: 1 },
  { parentItemId: ITEM_IDS.DRIVE, childItemId: ITEM_IDS.GEAR, quantityPer: 2 },
  { parentItemId: ITEM_IDS.PANEL, childItemId: ITEM_IDS.ELECTRONICS, quantityPer: 3 },
];

export const initialCustomers: Customer[] = [
  { customerId: "CUST-A", name: "得意先A" },
  { customerId: "CUST-B", name: "得意先B" },
];

export const initialSuppliers: Supplier[] = [
  { supplierId: "SUP-STEEL", name: "鋼材仕入先" },
  { supplierId: "SUP-MOTOR", name: "モーター仕入先" },
  { supplierId: "SUP-GEAR", name: "歯車仕入先" },
  { supplierId: "SUP-ELECTRONICS", name: "電装部品仕入先" },
];
