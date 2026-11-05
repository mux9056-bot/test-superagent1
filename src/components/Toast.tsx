import { Icon } from './Icon';

export interface ToastState {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <div className="toast-region">
      <div
        className={`toast toast-${toast.kind}`}
        role={toast.kind === 'error' ? 'alert' : 'status'}
      >
        <Icon name={toast.kind === 'error' ? 'alert' : 'check'} size={18} />
        <span>{toast.text}</span>
        <button type="button" className="toast-close" aria-label="关闭提示" onClick={onDismiss}>
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
