import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  countVisibleChars,
  normalizeTitle,
} from '../domain/text';
import type {
  ConflictInfo,
  Priority,
  Task,
  TaskInput,
  TodoList,
} from '../domain/types';
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  hasErrors,
  validateTaskInput,
  type TaskFieldErrors,
} from '../domain/validation';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';
import { Modal, useDialogTitleId } from './Modal';
import type { SaveResult } from '../state/useTodoStore';

interface TaskDetailProps {
  mode: 'create' | 'edit';
  task?: Task;
  lists: TodoList[];
  initialListId: string;
  initialDueDate: string | null;
  onClose: () => void;
  onReloadLatest: () => void;
  onSave: (input: TaskInput, expectedRevision?: number) => SaveResult;
  onDelete?: (taskId: string) => SaveResult;
}

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
const PRIORITY_TEXT: Record<Priority, string> = { high: '高', medium: '中', low: '低' };

export function TaskDetail({
  mode,
  task,
  lists,
  initialListId,
  initialDueDate,
  onClose,
  onReloadLatest,
  onSave,
  onDelete,
}: TaskDetailProps) {
  const headingId = useDialogTitleId('task-detail-title');
  const fieldIdBase = useId().replace(/:/g, '');

  const initial = useMemo(
    () => ({
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: task?.dueDate ?? initialDueDate,
      priority: task?.priority ?? ('medium' as Priority),
      listId: task?.listId ?? initialListId,
    }),
    // The form initializes once per mounted editing session.
    [],
  );
  const mountRevision = useRef<number | null>(task?.revision ?? null);
  const initialTaskMissing = useRef(mode === 'edit' && !task);

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [dueDate, setDueDate] = useState<string | null>(initial.dueDate);
  const [priority, setPriority] = useState<Priority>(initial.priority);
  const [listId, setListId] = useState<string>(initial.listId);
  const [errors, setErrors] = useState<TaskFieldErrors>({});
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const composingRef = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const priorityRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLSelectElement>(null);

  const isDirty =
    title !== initial.title ||
    description !== initial.description ||
    dueDate !== initial.dueDate ||
    priority !== initial.priority ||
    listId !== initial.listId;

  const externalChange =
    mode === 'edit' &&
    (task === undefined ||
      (mountRevision.current !== null && task.revision !== mountRevision.current));

  function requestClose() {
    if (isDirty) setDiscardOpen(true);
    else onClose();
  }

  function clearError(field: keyof TaskFieldErrors) {
    setErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
    setSaveError(null);
    setConflict(null);
  }

  function focusFirstError(nextErrors: TaskFieldErrors) {
    const targets: Array<[keyof TaskFieldErrors, HTMLElement | null]> = [
      ['title', titleRef.current],
      ['description', descriptionRef.current],
      ['dueDate', dueDateRef.current],
      ['priority', priorityRef.current],
      ['listId', listRef.current],
    ];
    const first = targets.find(([key]) => nextErrors[key]);
    if (first) window.requestAnimationFrame(() => first[1]?.focus());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (composingRef.current) return;

    const input: TaskInput = {
      title,
      description,
      dueDate,
      priority,
      listId,
    };
    // The selected list can disappear while this panel is open (another tab).
    // Surface a reload prompt instead of a generic field error or invalid ref.
    if (mode === 'edit' && !lists.some((list) => list.id === listId)) {
      setErrors({});
      setSaveError(null);
      setConflict({
        kind: 'list-deleted',
        message: '任务所属清单已被删除，请重新载入最新数据。',
      });
      return;
    }
    const nextErrors = validateTaskInput(input, lists);
    if (hasErrors(nextErrors)) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    setErrors({});
    setSaveError(null);
    setConflict(null);
    const result =
      mode === 'edit' && mountRevision.current !== null
        ? onSave(input, mountRevision.current)
        : onSave(input);

    if (result.ok) {
      onClose();
      return;
    }

    submittingRef.current = false;
    setSaving(false);
    if (result.fieldErrors) {
      setErrors(result.fieldErrors);
      focusFirstError(result.fieldErrors);
    }
    if (result.conflict) setConflict(result.conflict);
    if (result.message && !result.fieldErrors && !result.conflict) {
      setSaveError(result.message);
    }
  }

  function handleDelete() {
    if (!task || !onDelete) return;
    setDeleteError(null);
    const result = onDelete(task.id);
    if (result.ok) {
      setDeleteOpen(false);
      onClose();
    } else {
      setDeleteError(result.message ?? '保存失败，请重试');
    }
  }

  const titleLength = countVisibleChars(title);
  const descriptionLength = countVisibleChars(description);
  const fieldIds = {
    title: `${fieldIdBase}-title`,
    titleError: `${fieldIdBase}-title-error`,
    description: `${fieldIdBase}-description`,
    descriptionError: `${fieldIdBase}-description-error`,
    dueDate: `${fieldIdBase}-due-date`,
    dueDateError: `${fieldIdBase}-due-date-error`,
    priority: `${fieldIdBase}-priority-high`,
    priorityError: `${fieldIdBase}-priority-error`,
    listId: `${fieldIdBase}-list`,
    listIdError: `${fieldIdBase}-list-error`,
  };

  return (
    <Modal
      labelledBy={headingId}
      onRequestClose={requestClose}
      variant="panel"
      className="task-detail"
    >
      <header className="panel-header">
        <button type="button" className="icon-button" aria-label="关闭任务详情" onClick={requestClose}>
          <Icon name="close" />
        </button>
        <div className="panel-header-text">
          <p className="eyebrow">{mode === 'create' ? '新任务' : '任务详情'}</p>
          <h2 id={headingId}>{mode === 'create' ? '新增任务' : '编辑任务'}</h2>
        </div>
        <span className="panel-header-spacer" aria-hidden="true" />
      </header>

      {initialTaskMissing.current ? (
        <div className="panel-body app-message">
          <Icon name="alert" size={28} />
          <h3>任务已不存在</h3>
          <p>该任务已在其他页面被删除，当前页面没有恢复旧数据。</p>
          <div className="dialog-actions">
            <button type="button" className="button button-ghost" onClick={onClose}>
              关闭
            </button>
            <button type="button" className="button button-primary" onClick={onReloadLatest}>
              载入最新数据
            </button>
          </div>
        </div>
      ) : (
        <form className="task-form" onSubmit={handleSubmit} noValidate>
          <div className="panel-body">
            {externalChange && !conflict ? (
              <div className="form-alert form-alert-info" role="status">
                <div>
                  <strong>{task ? '其他页面已更新此任务。' : '此任务已在其他页面被删除。'}</strong>
                  <span> 保存时会检查冲突，不会静默覆盖。</span>
                </div>
                <button type="button" className="button button-small" onClick={onReloadLatest}>
                  载入最新记录
                </button>
              </div>
            ) : null}

            {conflict ? (
              <div className="form-alert form-alert-error" role="alert">
                <div>
                  <strong>无法保存：数据已变化。</strong>
                  <span> {conflict.message}</span>
                </div>
                <button type="button" className="button button-small" onClick={onReloadLatest}>
                  载入最新记录
                </button>
              </div>
            ) : null}

            {saveError ? (
              <p className="form-alert form-alert-error" role="alert">
                {saveError}
              </p>
            ) : null}

            <div className="field">
              <div className="field-label-row">
                <label htmlFor={fieldIds.title}>标题</label>
                <span className={titleLength > TITLE_MAX ? 'counter counter-over' : 'counter'}>
                  {titleLength}/{TITLE_MAX}
                </span>
              </div>
              <input
                ref={titleRef}
                id={fieldIds.title}
                type="text"
                value={title}
                autoComplete="off"
                placeholder="要做什么？"
                aria-required="true"
                aria-invalid={errors.title ? true : undefined}
                aria-describedby={errors.title ? fieldIds.titleError : undefined}
                data-autofocus
                onChange={(event) => {
                  setTitle(normalizeTitle(event.target.value));
                  clearError('title');
                }}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={() => {
                  composingRef.current = false;
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (composingRef.current || event.nativeEvent.isComposing)
                  ) {
                    event.preventDefault();
                  }
                }}
              />
              {errors.title ? (
                <p id={fieldIds.titleError} className="field-error" role="alert">
                  {errors.title}
                </p>
              ) : null}
            </div>

            <div className="field">
              <div className="field-label-row">
                <label htmlFor={fieldIds.description}>备注</label>
                <span
                  className={
                    descriptionLength > DESCRIPTION_MAX ? 'counter counter-over' : 'counter'
                  }
                >
                  {descriptionLength}/{DESCRIPTION_MAX}
                </span>
              </div>
              <textarea
                ref={descriptionRef}
                id={fieldIds.description}
                value={description}
                rows={5}
                placeholder="补充说明（可选）"
                aria-invalid={errors.description ? true : undefined}
                aria-describedby={errors.description ? fieldIds.descriptionError : undefined}
                onChange={(event) => {
                  setDescription(event.target.value);
                  clearError('description');
                }}
              />
              {errors.description ? (
                <p id={fieldIds.descriptionError} className="field-error" role="alert">
                  {errors.description}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor={fieldIds.dueDate}>到期日期</label>
              <div className="date-row">
                <input
                  ref={dueDateRef}
                  id={fieldIds.dueDate}
                  type="date"
                  value={dueDate ?? ''}
                  aria-invalid={errors.dueDate ? true : undefined}
                  aria-describedby={errors.dueDate ? fieldIds.dueDateError : undefined}
                  onChange={(event) => {
                    setDueDate(event.target.value === '' ? null : event.target.value);
                    clearError('dueDate');
                  }}
                />
                {dueDate ? (
                  <button
                    type="button"
                    className="button button-ghost button-small"
                    onClick={() => {
                      setDueDate(null);
                      clearError('dueDate');
                    }}
                  >
                    清除日期
                  </button>
                ) : null}
              </div>
              {errors.dueDate ? (
                <p id={fieldIds.dueDateError} className="field-error" role="alert">
                  {errors.dueDate}
                </p>
              ) : null}
            </div>

            <fieldset className="field field-group">
              <legend>优先级</legend>
              <div className="radio-row">
                {PRIORITIES.map((option, index) => (
                  <label key={option} className="radio-option">
                    <input
                      ref={index === 0 ? priorityRef : undefined}
                      id={`${fieldIdBase}-priority-${option}`}
                      type="radio"
                      name={`${fieldIdBase}-priority`}
                      value={option}
                      checked={priority === option}
                      onChange={() => {
                        setPriority(option);
                        clearError('priority');
                      }}
                    />
                    <span>{PRIORITY_TEXT[option]}</span>
                  </label>
                ))}
              </div>
              {errors.priority ? (
                <p id={fieldIds.priorityError} className="field-error" role="alert">
                  {errors.priority}
                </p>
              ) : null}
            </fieldset>

            <div className="field">
              <label htmlFor={fieldIds.listId}>所属清单</label>
              <select
                ref={listRef}
                id={fieldIds.listId}
                value={listId}
                aria-invalid={errors.listId ? true : undefined}
                aria-describedby={errors.listId ? fieldIds.listIdError : undefined}
                onChange={(event) => {
                  setListId(event.target.value);
                  clearError('listId');
                }}
              >
                {!lists.some((list) => list.id === listId) ? (
                  <option value={listId}>原清单已删除</option>
                ) : null}
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
              {errors.listId ? (
                <p id={fieldIds.listIdError} className="field-error" role="alert">
                  {errors.listId}
                </p>
              ) : null}
            </div>
          </div>

          <footer className="panel-footer">
            {mode === 'edit' && onDelete && task ? (
              <button
                type="button"
                className="button button-danger-ghost"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
              >
                <Icon name="trash" size={16} />
                删除任务
              </button>
            ) : (
              <span />
            )}
            <div className="panel-footer-actions">
              <button type="button" className="button button-ghost" onClick={requestClose}>
                取消
              </button>
              <button type="submit" className="button button-primary" disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </footer>
        </form>
      )}

      {discardOpen ? (
        <ConfirmDialog
          title="放弃修改？"
          message="你有未保存的修改，放弃后将无法恢复。"
          cancelLabel="继续编辑"
          confirmLabel="放弃修改"
          danger
          onCancel={() => setDiscardOpen(false)}
          onConfirm={onClose}
        />
      ) : null}

      {deleteOpen && task ? (
        <ConfirmDialog
          title="删除任务"
          message={
            <>
              <strong>「{title.trim() || task.title}」</strong>
              <br />
              删除后无法恢复，确定删除吗？
            </>
          }
          confirmLabel="删除"
          cancelLabel="取消"
          danger
          error={deleteError}
          onCancel={() => {
            setDeleteOpen(false);
            setDeleteError(null);
          }}
          onConfirm={handleDelete}
        />
      ) : null}
    </Modal>
  );
}
