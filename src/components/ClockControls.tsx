import type { Dispatch } from "react";
import type { SimulationAction } from "../domain/reducer";

interface Props {
  day: number;
  dispatch: Dispatch<SimulationAction>;
}

function ClockControls({ day, dispatch }: Props) {
  return (
    <section style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <strong style={{ fontSize: 20 }}>Day {day}</strong>
      <button onClick={() => dispatch({ type: "ADVANCE_DAY" })}>次の日へ進む</button>
      <button
        onClick={() => {
          if (window.confirm("現在の状態をすべて破棄して最初からやり直します。よろしいですか？")) {
            dispatch({ type: "RESET" });
          }
        }}
      >
        リセット
      </button>
    </section>
  );
}

export default ClockControls;
