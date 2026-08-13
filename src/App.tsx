import { useEffect, useReducer, useState } from "react";
import CancelConfirmModal from "./components/CancelConfirmModal";
import ClockControls from "./components/ClockControls";
import EventLogPanel from "./components/EventLogPanel";
import InventoryPanel from "./components/InventoryPanel";
import MasterDataPage from "./components/MasterDataPage";
import OrderForm from "./components/OrderForm";
import OrderGanttChart from "./components/OrderGanttChart";
import ProcessFlowDiagram from "./components/ProcessFlowDiagram";
import ShipmentPanel from "./components/ShipmentPanel";
import ThemeSelectModal from "./components/ThemeSelectModal";
import { AUTO_PLAY_INTERVALS_MS } from "./domain/autoPlay";
import { hasUnfinishedOrders } from "./domain/logic";
import { createInitialState, simulationReducer } from "./domain/reducer";
import { applyThemeToDocument, loadStoredTheme, storeTheme, type ThemeId } from "./theme";

type Tab = "main" | "process" | "master";

function App() {
  const [state, dispatch] = useReducer(simulationReducer, undefined, createInitialState);
  const [tab, setTab] = useState<Tab>("main");
  const [cancelTargetOrderId, setCancelTargetOrderId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeId>(loadStoredTheme);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [autoPlaySpeedLevel, setAutoPlaySpeedLevel] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  useEffect(() => {
    applyThemeToDocument(theme);
    storeTheme(theme);
  }, [theme]);

  // 自動再生：設定された間隔で「次の日へ進む」を繰り返し、登録された受注が
  // すべて出荷（または取消）されたら自動的に停止する。
  useEffect(() => {
    if (!isAutoPlaying) return;
    if (!hasUnfinishedOrders(state)) {
      setIsAutoPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: "ADVANCE_DAY" });
    }, AUTO_PLAY_INTERVALS_MS[autoPlaySpeedLevel]);
    return () => window.clearTimeout(timer);
  }, [isAutoPlaying, state, autoPlaySpeedLevel]);

  return (
    <div className="page">
      <header className="app-header">
        <h1>生産管理ミニマムシミュレーター</h1>

        <div className="header-controls">
          <nav className="tabs">
            <button aria-selected={tab === "main"} onClick={() => setTab("main")}>
              メイン画面
            </button>
            <button aria-selected={tab === "process"} onClick={() => setTab("process")}>
              プロセス図
            </button>
            <button aria-selected={tab === "master"} onClick={() => setTab("master")}>
              マスタ
            </button>
          </nav>

          <button type="button" className="btn btn-sm" onClick={() => setThemeModalOpen(true)}>
            スタイル
          </button>
        </div>
      </header>

      {tab === "main" && (
        <>
          <OrderForm state={state} dispatch={dispatch} />
          <OrderGanttChart state={state} onRequestCancel={setCancelTargetOrderId} />
          <InventoryPanel state={state} />
          <ShipmentPanel state={state} />
          <EventLogPanel state={state} />
          <ClockControls
            state={state}
            dispatch={dispatch}
            autoPlaySpeedLevel={autoPlaySpeedLevel}
            onChangeAutoPlaySpeedLevel={setAutoPlaySpeedLevel}
            isAutoPlaying={isAutoPlaying}
            onStartAutoPlay={() => setIsAutoPlaying(true)}
            onStopAutoPlay={() => setIsAutoPlaying(false)}
          />
        </>
      )}

      {tab === "process" && (
        <>
          <ProcessFlowDiagram state={state} />
          <ClockControls
            state={state}
            dispatch={dispatch}
            autoPlaySpeedLevel={autoPlaySpeedLevel}
            onChangeAutoPlaySpeedLevel={setAutoPlaySpeedLevel}
            isAutoPlaying={isAutoPlaying}
            onStartAutoPlay={() => setIsAutoPlaying(true)}
            onStopAutoPlay={() => setIsAutoPlaying(false)}
          />
        </>
      )}

      {tab === "master" && <MasterDataPage state={state} dispatch={dispatch} />}

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

      {themeModalOpen && (
        <ThemeSelectModal
          currentTheme={theme}
          onSelect={setTheme}
          onDismiss={() => setThemeModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
