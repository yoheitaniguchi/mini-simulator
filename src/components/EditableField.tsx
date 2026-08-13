import { useEffect, useState } from "react";

interface NumberFieldProps {
  value: number;
  min?: number;
  onCommit: (value: number) => void;
}

/**
 * 数値の編集可能フィールド。入力中はローカル状態で保持し、blur時にのみ確定値としてコミットする
 * （毎キー入力でstateをdispatchすると、途中の無効値（空文字など）でロジック層のバリデーションに
 * 弾かれて入力中の値が勝手に元に戻ってしまうため）。
 */
export function EditableNumberField({ value, min = 1, onCommit }: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <input
      type="number"
      min={min}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const num = Number(draft);
        if (Number.isFinite(num) && num >= min) {
          onCommit(num);
        } else {
          setDraft(String(value));
        }
      }}
      className="editable-number"
    />
  );
}

interface TextFieldProps {
  value: string;
  onCommit: (value: string) => void;
}

export function EditableTextField({ value, onCommit }: TextFieldProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim()) {
          onCommit(draft);
        } else {
          setDraft(value);
        }
      }}
    />
  );
}
