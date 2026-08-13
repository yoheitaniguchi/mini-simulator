import type { SimulationState } from "../types";

interface Props {
  state: SimulationState;
}

/** §13 在庫パネル：材料在庫（数量＋発注残）、仕掛品・完成品（受注ごとに「あり／なし」の二値） */
function InventoryPanel({ state }: Props) {
  const makeItems = state.items.filter((item) => item.category === "make");
  const peggedOrders = state.orders.filter((order) => order.status !== "取消済");

  return (
    <section className="panel grid-2">
      <div>
        <h2>材料在庫</h2>
        <div className="table-wrap">
          <table>
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
                    <td className="num">{stock.quantity}</td>
                    <td className="num">{outstanding}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2>仕掛品・完成品（受注ごと）</h2>
        {peggedOrders.length === 0 ? (
          <p className="empty-state">対象の受注がありません。</p>
        ) : (
          <div className="table-wrap">
            <table>
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
                      const statusClass = hasFg ? "status-success" : hasWip ? "status-wip" : "status-muted";
                      return (
                        <td key={item.itemId} className={`center ${statusClass}`}>
                          {label}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default InventoryPanel;
