import type { ReactNode } from 'react';
import { Modal, useDialogTitleId } from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  danger = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useDialogTitleId('confirm-title');
  return (
    <Modal labelledBy={titleId} onRequestClose={onCancel} variant="dialog" className="confirm-dialog">
      <h2 id={titleId} className="dialog-title">
        {title}
      </h2>
      <div className="dialog-message">{message}</div>
      {error ? (
        <p className="form-alert" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dialog-actions">
        <button type="button" className="button button-ghost" onClick={onCancel} data-autofocus>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? 'button button-danger' : 'button button-primary'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
