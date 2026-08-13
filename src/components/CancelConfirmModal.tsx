interface Props {
  orderId: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

/** §15 取消操作の画面設計：不可逆な操作のため、確認モーダルを挟む */
function CancelConfirmModal({ orderId, onConfirm, onDismiss }: Props) {
  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" onClick={onDismiss}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>受注を取消しますか？</h3>
        <p>
          受注 {orderId} を取消します。<strong>この操作は取り消せません。</strong>
        </p>
        <div className="modal-actions">
          <button className="btn" onClick={onDismiss}>
            キャンセル
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            取消を実行
          </button>
        </div>
      </div>
    </div>
  );
}

export default CancelConfirmModal;
