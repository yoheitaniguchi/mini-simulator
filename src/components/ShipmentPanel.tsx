import type { SimulationState } from "../types";

interface Props {
  state: SimulationState;
}

/** §13 出荷実績パネル：出荷済の受注と、納期遵守状況 */
function ShipmentPanel({ state }: Props) {
  const shipped = state.orders
    .filter((order) => order.status === "出荷済")
    .slice()
    .sort((a, b) => (a.shippedDay ?? 0) - (b.shippedDay ?? 0));

  return (
    <section className="panel">
      <h2>出荷実績</h2>
      {shipped.length === 0 ? (
        <p className="empty-state">出荷実績はまだありません。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>受注番号</th>
                <th>得意先</th>
                <th>納期</th>
                <th>出荷日</th>
                <th>納期遵守</th>
              </tr>
            </thead>
            <tbody>
              {shipped.map((order) => {
                const onTime = (order.shippedDay ?? 0) <= order.dueDay;
                return (
                  <tr key={order.orderId}>
                    <td>{order.orderId}</td>
                    <td>{state.customers.find((c) => c.customerId === order.customerId)?.name}</td>
                    <td>D{order.dueDay}</td>
                    <td>D{order.shippedDay}</td>
                    <td className={onTime ? "status-success" : "status-danger"}>
                      {onTime ? "オンタイム" : "遅延"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default ShipmentPanel;
