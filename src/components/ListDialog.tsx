import { useRef, useState, type FormEvent } from 'react';
import type { ListResult } from '../state/useTodoStore';
import type { TodoList } from '../domain/types';
import { Modal, useDialogTitleId } from './Modal';

interface ListDialogProps {
  mode: 'create' | 'rename';
  list?: TodoList;
  onClose: () => void;
  onSubmit: (name: string) => ListResult;
}

export function ListDialog({ mode, list, onClose, onSubmit }: ListDialogProps) {
  const titleId = useDialogTitleId('list-dialog-title');
  const [name, setName] = useState(list?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    const result = onSubmit(name);
    if (result.ok) {
      onClose();
      return;
    }
    submittingRef.current = false;
    setError(result.message ?? '保存失败，请重试');
  }

  return (
    <Modal labelledBy={titleId} onRequestClose={onClose} variant="dialog">
      <form onSubmit={handleSubmit} noValidate>
        <h2 id={titleId} className="dialog-title">
          {mode === 'create' ? '新建清单' : '重命名清单'}
        </h2>
        <div className="field">
          <label htmlFor="list-name">清单名称</label>
          <input
            id="list-name"
            type="text"
            value={name}
            autoComplete="off"
            placeholder="例如：工作"
            data-autofocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'list-name-error' : 'list-name-hint'}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
          <p id="list-name-hint" className="field-hint">
            1–30 个字符，不能与现有清单重名。
          </p>
          {error ? (
            <p id="list-name-error" className="field-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="dialog-actions">
          <button type="button" className="button button-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="button button-primary">
            {mode === 'create' ? '创建' : '保存'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
