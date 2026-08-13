import type { Dispatch } from "react";
import type { SimulationAction } from "../domain/reducer";

interface Props {
  day: number;
  dispatch: Dispatch<SimulationAction>;
}

function ClockControls({ day, dispatch }: Props) {
  return (
    <section className="panel toolbar floating-toolbar">
      <span className="day-badge">Day {day}</span>
      <button className="btn btn-primary" onClick={() => dispatch({ type: "ADVANCE_DAY" })}>
        次の日へ進む
      </button>
      <button
        className="btn"
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
