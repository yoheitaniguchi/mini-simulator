import { useReducer, useState } from "react";
import CancelConfirmModal from "./components/CancelConfirmModal";
import ClockControls from "./components/ClockControls";
import EventLogPanel from "./components/EventLogPanel";
import InventoryPanel from "./components/InventoryPanel";
import MasterDataPage from "./components/MasterDataPage";
import OrderForm from "./components/OrderForm";
import OrderGanttChart from "./components/OrderGanttChart";
import ShipmentPanel from "./components/ShipmentPanel";
import { createInitialState, simulationReducer } from "./domain/reducer";

type Tab = "main" | "master";

function App() {
  const [state, dispatch] = useReducer(simulationReducer, undefined, createInitialState);
  const [tab, setTab] = useState<Tab>("main");
  const [cancelTargetOrderId, setCancelTargetOrderId] = useState<string | null>(null);

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 1024, margin: "0 auto", padding: 16 }}>
      <h1>生産管理ミニマムシミュレーター</h1>

      <nav style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #ddd" }}>
        <button
          onClick={() => setTab("main")}
          style={{ fontWeight: tab === "main" ? "bold" : "normal" }}
        >
          メイン画面
        </button>
        <button
          onClick={() => setTab("master")}
          style={{ fontWeight: tab === "master" ? "bold" : "normal" }}
        >
          マスタ
        </button>
      </nav>

      {tab === "main" ? (
        <>
          <ClockControls day={state.day} dispatch={dispatch} />
          <OrderForm state={state} dispatch={dispatch} />
          <OrderGanttChart state={state} onRequestCancel={setCancelTargetOrderId} />
          <InventoryPanel state={state} />
          <ShipmentPanel state={state} />
          <EventLogPanel state={state} />
        </>
      ) : (
        <MasterDataPage state={state} dispatch={dispatch} />
      )}

      {cancelTargetOrderId && (
        <CancelConfirmModal
          orderId={cancelTargetOrderId}
          onDismiss={() => setCancelTargetOrderId(null)}
          onConfirm={() => {
            dispatch({ type: "ORDER_CANCEL", payload: { orderId: cancelTargetOrderId } });
            setCancelTargetOrderId(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
