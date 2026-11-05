import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';

export function LoadingScreen() {
  return (
    <div className="screen-center" role="status" aria-live="polite">
      <div className="loading-card">
        <span className="spinner" aria-hidden="true" />
        <p>正在读取本地数据…</p>
        <div className="skeleton-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export function LoadErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="screen-center">
      <div className="error-card" role="alert">
        <span className="error-icon" aria-hidden="true">
          <Icon name="alert" size={28} />
        </span>
        <h1>无法读取本地数据</h1>
        <p>{message}</p>
        <p className="muted">
          为避免把已有数据误显示为空，应用暂时无法进入任务列表。请检查浏览器是否允许本站使用本地存储。
        </p>
        <button type="button" className="button button-primary" onClick={onRetry}>
          <Icon name="refresh" size={17} />
          重试
        </button>
      </div>
    </div>
  );
}

interface IssueScreenProps {
  kind: 'corrupt' | 'incompatible';
  message: string;
  onRetry: () => void;
  onReset: () => boolean;
}

export function IssueScreen({ kind, message, onRetry, onReset }: IssueScreenProps) {
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetError, setResetError] = useState<string | null>(null);

  function performReset() {
    const ok = onReset();
    if (!ok) {
      setResetError('重置失败：无法写入本地存储，请检查浏览器设置后重试。');
    }
  }

  return (
    <div className="screen-center">
      <div className="error-card" role="alert">
        <span className="error-icon" aria-hidden="true">
          <Icon name="alert" size={28} />
        </span>
        <h1>{kind === 'incompatible' ? '数据版本不兼容' : '本地数据无法读取'}</h1>
        <p>{message}</p>
        <p className="muted">
          应用没有自动清空或覆盖这些数据。你可以重新读取；如果确认不再需要原数据，也可以手动重置。
        </p>
        <div className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onRetry}>
            <Icon name="refresh" size={17} />
            重新读取
          </button>
          <button
            type="button"
            className="button button-danger-ghost"
            onClick={() => {
              setResetError(null);
              setResetStep(1);
            }}
          >
            <Icon name="trash" size={17} />
            重置数据
          </button>
        </div>
      </div>

      {resetStep === 1 ? (
        <ConfirmDialog
          title="重置本地数据？"
          message="重置会清空当前浏览器中的全部任务和清单，且无法恢复。原始数据将不再保留。"
          cancelLabel="取消"
          confirmLabel="继续"
          danger
          onCancel={() => setResetStep(0)}
          onConfirm={() => setResetStep(2)}
        />
      ) : null}

      {resetStep === 2 ? (
        <ConfirmDialog
          title="再次确认重置"
          message="此操作不可撤销。确认后会清空全部数据并重新初始化「收集箱」。"
          cancelLabel="取消"
          confirmLabel="确认重置"
          danger
          error={resetError}
          onCancel={() => {
            setResetStep(0);
            setResetError(null);
          }}
          onConfirm={performReset}
        />
      ) : null}
    </div>
  );
}

export function StorageBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="storage-banner" role="alert">
      <Icon name="alert" size={18} />
      <span>{message}</span>
      <button type="button" className="button button-small button-secondary" onClick={onRetry}>
        重试
      </button>
    </div>
  );
}
