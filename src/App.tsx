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
import { createInitialState, simulationReducer } from "./domain/reducer";
import { applyThemeToDocument, loadStoredTheme, storeTheme, THEME_OPTIONS, type ThemeId } from "./theme";

type Tab = "main" | "process" | "master";

const LIGHT_THEMES = THEME_OPTIONS.filter((option) => option.group === "light");
const DARK_THEMES = THEME_OPTIONS.filter((option) => option.group === "dark");

function App() {
  const [state, dispatch] = useReducer(simulationReducer, undefined, createInitialState);
  const [tab, setTab] = useState<Tab>("main");
  const [cancelTargetOrderId, setCancelTargetOrderId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeId>(loadStoredTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    storeTheme(theme);
  }, [theme]);

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

          <label className="field theme-select-field">
            <span className="sr-only">画面テーマ</span>
            <select
              className="theme-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeId)}
              aria-label="画面テーマ"
            >
              <optgroup label="ライト">
                {LIGHT_THEMES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="ダーク">
                {DARK_THEMES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
        </div>
      </header>

      {tab === "main" && (
        <>
          <OrderForm state={state} dispatch={dispatch} />
          <OrderGanttChart state={state} onRequestCancel={setCancelTargetOrderId} />
          <InventoryPanel state={state} />
          <ShipmentPanel state={state} />
          <EventLogPanel state={state} />
          <ClockControls day={state.day} dispatch={dispatch} />
        </>
      )}

      {tab === "process" && (
        <>
          <ProcessFlowDiagram state={state} />
          <ClockControls day={state.day} dispatch={dispatch} />
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
    </div>
  );
}

export default App;
