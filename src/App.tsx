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
    <div className="page">
      <header className="app-header">
        <h1>生産管理ミニマムシミュレーター</h1>

        <nav className="tabs">
          <button aria-selected={tab === "main"} onClick={() => setTab("main")}>
            メイン画面
          </button>
          <button aria-selected={tab === "master"} onClick={() => setTab("master")}>
            マスタ
          </button>
        </nav>
      </header>

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
