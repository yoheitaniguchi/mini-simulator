import type { SimulationState } from "../types";

interface Props {
  state: SimulationState;
}

/** §13 在庫パネル：材料在庫（数量＋発注残）、仕掛品・完成品（受注ごとに「あり／なし」の二値） */
function InventoryPanel({ state }: Props) {
  const makeItems = state.items.filter((item) => item.category === "make");
  const peggedOrders = state.orders.filter((order) => order.status !== "取消済");

  return (
    <section style={{ marginBottom: 24, display: "flex", gap: 32, flexWrap: "wrap" }}>
      <div>
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
                  <td style={{ textAlign: "right" }}>{stock.quantity}</td>
                  <td style={{ textAlign: "right" }}>{outstanding}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h2>仕掛品・完成品（受注ごと）</h2>
        {peggedOrders.length === 0 ? (
          <p>対象の受注がありません。</p>
        ) : (
          <table border={1} cellPadding={4} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>受注番号</th>
                {makeItems.map((item) => (
                  <th key={item.itemId}>{item.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {peggedOrders.map((order) => (
                <tr key={order.orderId}>
                  <td>{order.orderId}</td>
                  {makeItems.map((item) => {
                    const hasFg = state.fgRecords.some(
                      (r) => r.orderId === order.orderId && r.itemId === item.itemId,
                    );
                    const hasWip = state.wipRecords.some(
                      (r) => r.orderId === order.orderId && r.itemId === item.itemId,
                    );
                    const label = hasFg ? "完成" : hasWip ? "仕掛中" : "-";
                    return (
                      <td
                        key={item.itemId}
                        style={{
                          textAlign: "center",
                          color: hasFg ? "#1a9850" : hasWip ? "#0f9b8e" : "#999",
                        }}
                      >
                        {label}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default InventoryPanel;
