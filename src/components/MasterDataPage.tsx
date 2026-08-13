import type { Dispatch } from "react";
import type { SimulationAction } from "../domain/reducer";
import type { SimulationState } from "../types";
import { EditableNumberField, EditableTextField } from "./EditableField";

interface Props {
  state: SimulationState;
  dispatch: Dispatch<SimulationAction>;
}

const categoryLabel: Record<string, string> = { make: "内製", buy: "購買" };

/**
 * §14 マスタ画面。編集可否の線引き：
 * - 品目の標準リードタイムは編集可、区分（内製／購買）は編集不可（構造が変わるため）
 * - BOMの員数は編集可、構造（品目の追加・削除）は編集不可
 * - 仕入先・得意先の名称は編集可、新規追加は編集不可
 */
function MasterDataPage({ state, dispatch }: Props) {
  return (
    <div>
      <section className="panel">
        <h2>マスタ</h2>
        <p className="master-note">
          マスタの変更は、仕掛開始の瞬間にその時点の値を確定値として受注に焼き付ける。
          既に仕掛開始済みの受注には影響せず、次に新規で仕掛開始する受注からのみ適用される。
        </p>
      </section>

      <section className="panel">
        <h3>品目マスタ</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>品目</th>
                <th>区分</th>
                <th>標準リードタイム（日）</th>
              </tr>
            </thead>
            <tbody>
              {state.items.map((item) => (
                <tr key={item.itemId}>
                  <td>{item.name}</td>
                  <td>{categoryLabel[item.category]}</td>
                  <td>
                    <EditableNumberField
                      value={item.leadTimeDays}
                      min={1}
                      onCommit={(leadTimeDays) =>
                        dispatch({
                          type: "MASTER_UPDATE_ITEM_LEAD_TIME",
                          payload: { itemId: item.itemId, leadTimeDays },
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>BOM（構成）</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>親品目</th>
                <th>子品目</th>
                <th>員数</th>
              </tr>
            </thead>
            <tbody>
              {state.bom.map((line) => (
                <tr key={`${line.parentItemId}-${line.childItemId}`}>
                  <td>{state.items.find((i) => i.itemId === line.parentItemId)?.name}</td>
                  <td>{state.items.find((i) => i.itemId === line.childItemId)?.name}</td>
                  <td>
                    <EditableNumberField
                      value={line.quantityPer}
                      min={1}
                      onCommit={(quantityPer) =>
                        dispatch({
                          type: "MASTER_UPDATE_BOM_QUANTITY",
                          payload: {
                            parentItemId: line.parentItemId,
                            childItemId: line.childItemId,
                            quantityPer,
                          },
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel grid-2">
        <div>
          <h3>得意先マスタ</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>得意先名</th>
                </tr>
              </thead>
              <tbody>
                {state.customers.map((customer) => (
                  <tr key={customer.customerId}>
                    <td>
                      <EditableTextField
                        value={customer.name}
                        onCommit={(name) =>
                          dispatch({
                            type: "MASTER_UPDATE_CUSTOMER_NAME",
                            payload: { customerId: customer.customerId, name },
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3>仕入先マスタ</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>仕入先名</th>
                </tr>
              </thead>
              <tbody>
                {state.suppliers.map((supplier) => (
                  <tr key={supplier.supplierId}>
                    <td>
                      <EditableTextField
                        value={supplier.name}
                        onCommit={(name) =>
                          dispatch({
                            type: "MASTER_UPDATE_SUPPLIER_NAME",
                            payload: { supplierId: supplier.supplierId, name },
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MasterDataPage;
