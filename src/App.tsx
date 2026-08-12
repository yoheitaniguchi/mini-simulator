import { useReducer, useState } from "react";
import { createInitialState, simulationReducer } from "./domain/reducer";

const statusLabel: Record<string, string> = {
  受注済: "受注済",
  引当中: "引当中",
  出荷済: "出荷済",
  取消済: "取消済",
};

function App() {
  const [state, dispatch] = useReducer(simulationReducer, undefined, createInitialState);
  const [customerId, setCustomerId] = useState(state.customers[0]?.customerId ?? "");
  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState(1_000_000);
  const [dueDay, setDueDay] = useState(20);

  const topLevelItem = state.items.find((item) => item.itemId === "CONVEYOR");

  function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!topLevelItem) return;
    dispatch({
      type: "ORDER_CREATE",
      payload: {
        customerId,
        productItemId: topLevelItem.itemId,
        quantity,
        amount,
        dueDay,
      },
    });
  }

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1>生産管理ミニマムシミュレーター</h1>

      <section style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <strong style={{ fontSize: 20 }}>Day {state.day}</strong>
        <button onClick={() => dispatch({ type: "ADVANCE_DAY" })}>次の日へ進む</button>
        <button onClick={() => dispatch({ type: "RESET" })}>リセット</button>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>受注入力</h2>
        <form onSubmit={handleCreateOrder} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label>
            得意先
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {state.customers.map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            製品: {topLevelItem?.name}
          </label>
          <label>
            数量
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <label>
            金額
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
          <label>
            納期（D+）
            <input
              type="number"
              min={state.day}
              value={dueDay}
              onChange={(e) => setDueDay(Number(e.target.value))}
            />
          </label>
          <button type="submit">受注登録</button>
        </form>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>受注一覧</h2>
        <table border={1} cellPadding={4} style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>受注番号</th>
              <th>得意先</th>
              <th>数量</th>
              <th>納期</th>
              <th>状態</th>
              <th>出荷日</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {state.orders.map((order) => (
              <tr key={order.orderId} style={{ opacity: order.status === "取消済" ? 0.5 : 1 }}>
                <td>{order.orderId}</td>
                <td>{state.customers.find((c) => c.customerId === order.customerId)?.name}</td>
                <td>{order.quantity}</td>
                <td>D{order.dueDay}</td>
                <td>{statusLabel[order.status]}</td>
                <td>{order.shippedDay !== undefined ? `D${order.shippedDay}` : "-"}</td>
                <td>
                  {order.status === "受注済" && (
                    <button
                      onClick={() =>
                        dispatch({ type: "ORDER_CANCEL", payload: { orderId: order.orderId } })
                      }
                    >
                      取消
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>材料在庫</h2>
        <table border={1} cellPadding={4} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>品目</th>
              <th>在庫数</th>
              <th>発注残</th>
            </tr>
          </thead>
          <tbody>
            {state.materialStocks.map((stock) => {
              const outstanding = state.purchaseOrders
                .filter((po) => po.itemId === stock.itemId && !po.arrived)
                .reduce((sum, po) => sum + po.quantity, 0);
              return (
                <tr key={stock.itemId}>
                  <td>{state.items.find((i) => i.itemId === stock.itemId)?.name}</td>
                  <td>{stock.quantity}</td>
                  <td>{outstanding}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2>本日の出来事ログ</h2>
        <ul>
          {state.eventLog
            .slice()
            .reverse()
            .map((entry, i) => (
              <li key={i}>
                D{entry.day}: {entry.message}
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
