interface Props {
  orderId: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

/** §15 取消操作の画面設計：不可逆な操作のため、確認モーダルを挟む */
function CancelConfirmModal({ orderId, onConfirm, onDismiss }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 24,
          minWidth: 320,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>受注を取消しますか？</h3>
        <p>
          受注 {orderId} を取消します。<strong>この操作は取り消せません。</strong>
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onDismiss}>キャンセル</button>
          <button onClick={onConfirm}>取消を実行</button>
        </div>
      </div>
    </div>
  );
}

export default CancelConfirmModal;
