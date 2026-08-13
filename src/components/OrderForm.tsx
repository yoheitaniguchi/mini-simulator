import { useState, type Dispatch, type FormEvent } from "react";
import type { SimulationAction } from "../domain/reducer";
import type { SimulationState } from "../types";

interface Props {
  state: SimulationState;
  dispatch: Dispatch<SimulationAction>;
}

const TOP_LEVEL_ITEM_ID = "CONVEYOR";

function OrderForm({ state, dispatch }: Props) {
  const [customerId, setCustomerId] = useState(state.customers[0]?.customerId ?? "");
  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState(1_000_000);
  const [dueDay, setDueDay] = useState(state.day + 20);

  const topLevelItem = state.items.find((item) => item.itemId === TOP_LEVEL_ITEM_ID);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!topLevelItem || !customerId) return;
    dispatch({
      type: "ORDER_CREATE",
      payload: { customerId, productItemId: topLevelItem.itemId, quantity, amount, dueDay },
    });
  }

  return (
    <section className="panel">
      <h2>受注入力</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="field">
          得意先
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {state.customers.map((c) => (
              <option key={c.customerId} value={c.customerId}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          製品
          <span className="field-static">{topLevelItem?.name}</span>
        </label>
        <label className="field">
          数量
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
        <label className="field">
          金額
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        <label className="field">
          納期（D+）
          <input
            type="number"
            min={state.day}
            value={dueDay}
            onChange={(e) => setDueDay(Number(e.target.value))}
          />
        </label>
        <button type="submit" className="btn btn-primary">
          受注登録
        </button>
      </form>
    </section>
  );
}

export default OrderForm;
