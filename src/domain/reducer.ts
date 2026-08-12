// useReducer用reducer（docs/design.md §12）
import { initialBom, initialCustomers, initialItems, initialSuppliers } from "../data/masterData";
import type { CreateOrderInput, SimulationState } from "../types";
import { advanceDay, cancelOrder, createOrder } from "./logic";

export type SimulationAction =
  | { type: "ORDER_CREATE"; payload: CreateOrderInput }
  | { type: "ORDER_CANCEL"; payload: { orderId: string } }
  | { type: "ADVANCE_DAY" }
  | { type: "RESET" };

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
    default:
      return state;
  }
}
