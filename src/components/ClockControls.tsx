import type { Dispatch } from "react";
import { AUTO_PLAY_INTERVALS_MS, AUTO_PLAY_SPEED_LABELS } from "../domain/autoPlay";
import { hasUnfinishedOrders } from "../domain/logic";
import type { SimulationAction } from "../domain/reducer";
import type { SimulationState } from "../types";

interface Props {
  state: SimulationState;
  dispatch: Dispatch<SimulationAction>;
  autoPlaySpeedLevel: number;
  onChangeAutoPlaySpeedLevel: (level: number) => void;
  isAutoPlaying: boolean;
  onStartAutoPlay: () => void;
  onStopAutoPlay: () => void;
}

function ClockControls({
  state,
  dispatch,
  autoPlaySpeedLevel,
  onChangeAutoPlaySpeedLevel,
  isAutoPlaying,
  onStartAutoPlay,
  onStopAutoPlay,
}: Props) {
  const canStartAutoPlay = autoPlaySpeedLevel > 0 && hasUnfinishedOrders(state);

  return (
    <section className="panel toolbar floating-toolbar">
      <span className="day-badge">Day {state.day}</span>
      <button
        className="btn btn-primary"
        disabled={isAutoPlaying}
        onClick={() => dispatch({ type: "ADVANCE_DAY" })}
      >
        次の日へ進む
      </button>

      <label className="auto-play-speed">
        自動再生速度
        <select
          value={autoPlaySpeedLevel}
          disabled={isAutoPlaying}
          onChange={(event) => onChangeAutoPlaySpeedLevel(Number(event.target.value))}
        >
          {AUTO_PLAY_INTERVALS_MS.map((_, level) => (
            <option key={level} value={level}>
              {AUTO_PLAY_SPEED_LABELS[level]}
            </option>
          ))}
        </select>
      </label>

      {isAutoPlaying ? (
        <button className="btn" onClick={onStopAutoPlay}>
          自動再生を停止
        </button>
      ) : (
        <button className="btn" disabled={!canStartAutoPlay} onClick={onStartAutoPlay}>
          自動再生開始
        </button>
      )}

      <button
        className="btn"
        disabled={isAutoPlaying}
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
