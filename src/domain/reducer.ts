// useReducer用reducer（docs/design.md §12）
import { initialBom, initialCustomers, initialItems, initialSuppliers } from "../data/masterData";
import type { CreateOrderInput, SimulationState } from "../types";
import {
  advanceDay,
  cancelOrder,
  createOrder,
  updateBomQuantity,
  updateCustomerName,
  updateItemLeadTime,
  updateSupplierName,
} from "./logic";

export type SimulationAction =
  | { type: "ORDER_CREATE"; payload: CreateOrderInput }
  | { type: "ORDER_CANCEL"; payload: { orderId: string } }
  | { type: "ADVANCE_DAY" }
  | { type: "RESET" }
  | { type: "MASTER_UPDATE_ITEM_LEAD_TIME"; payload: { itemId: string; leadTimeDays: number } }
  | {
      type: "MASTER_UPDATE_BOM_QUANTITY";
      payload: { parentItemId: string; childItemId: string; quantityPer: number };
    }
  | { type: "MASTER_UPDATE_CUSTOMER_NAME"; payload: { customerId: string; name: string } }
  | { type: "MASTER_UPDATE_SUPPLIER_NAME"; payload: { supplierId: string; name: string } };

export function createInitialState(): SimulationState {
  return {
    day: 0,
    orders: [],
    wipRecords: [],
    fgRecords: [],
    purchaseOrders: [],
    materialStocks: initialItems
      .filter((item) => item.category === "buy")
      .map((item) => ({ itemId: item.itemId, quantity: 0 })),
    items: structuredClone(initialItems),
    bom: structuredClone(initialBom),
    customers: structuredClone(initialCustomers),
    suppliers: structuredClone(initialSuppliers),
    eventLog: [],
    nextOrderSeq: 1,
    nextPoSeq: 1,
  };
}

export function simulationReducer(
  state: SimulationState,
  action: SimulationAction,
): SimulationState {
  switch (action.type) {
    case "ORDER_CREATE": {
      const next = structuredClone(state);
      createOrder(next, action.payload);
      return next;
    }
    case "ORDER_CANCEL": {
      const next = structuredClone(state);
      cancelOrder(next, action.payload.orderId);
      return next;
    }
    case "ADVANCE_DAY": {
      const next = structuredClone(state);
      advanceDay(next);
      return next;
    }
    case "RESET": {
      return createInitialState();
    }
    case "MASTER_UPDATE_ITEM_LEAD_TIME": {
      const next = structuredClone(state);
      updateItemLeadTime(next, action.payload.itemId, action.payload.leadTimeDays);
      return next;
    }
    case "MASTER_UPDATE_BOM_QUANTITY": {
      const next = structuredClone(state);
      updateBomQuantity(
        next,
        action.payload.parentItemId,
        action.payload.childItemId,
        action.payload.quantityPer,
      );
      return next;
    }
    case "MASTER_UPDATE_CUSTOMER_NAME": {
      const next = structuredClone(state);
      updateCustomerName(next, action.payload.customerId, action.payload.name);
      return next;
    }
    case "MASTER_UPDATE_SUPPLIER_NAME": {
      const next = structuredClone(state);
      updateSupplierName(next, action.payload.supplierId, action.payload.name);
      return next;
    }
    default:
      return state;
  }
}
