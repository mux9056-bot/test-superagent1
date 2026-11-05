import { useCallback, useEffect, useRef, useState } from 'react';
import { createId } from '../domain/id';
import {
  hasErrors,
  validateListName,
  validateTaskInput,
  type TaskFieldErrors,
} from '../domain/validation';
import type {
  AppData,
  ConflictInfo,
  Task,
  TaskInput,
  TodoList,
} from '../domain/types';
import { INBOX_ID } from '../domain/types';
import {
  CorruptDataError,
  STORAGE_KEY,
  StorageUnavailableError,
  clearData,
  createInitialData,
  loadData,
  parseStoredData,
  saveData,
} from '../storage/storage';

export type LoadStatus = 'loading' | 'ready' | 'issue' | 'load-error';

export interface SaveResult {
  ok: boolean;
  message?: string;
  task?: Task;
  fieldErrors?: TaskFieldErrors;
  conflict?: ConflictInfo;
}

export interface ListResult {
  ok: boolean;
  message?: string;
  list?: TodoList;
  affectedCount?: number;
}

export interface StorageIssue {
  kind: 'corrupt' | 'incompatible';
  message: string;
  raw: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function findList(data: AppData, listId: string): TodoList | undefined {
  return data.lists.find((list) => list.id === listId);
}

export function useTodoStore() {
  const [data, setData] = useState<AppData | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [issue, setIssue] = useState<StorageIssue | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [storageProblem, setStorageProblem] = useState<string | null>(null);
  const [firstRun, setFirstRun] = useState(false);
  const dataRef = useRef<AppData | null>(null);

  const applyData = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const initialize = useCallback(() => {
    setStatus('loading');
    setIssue(null);
    setLoadError(null);
    try {
      const stored = loadData();
      if (stored) {
        applyData(stored);
        setFirstRun(false);
        setStorageProblem(null);
      } else {
        const initial = createInitialData();
        setFirstRun(true);
        applyData(initial);
        try {
          saveData(initial);
          setStorageProblem(null);
        } catch {
          setStorageProblem('无法保存数据，请检查浏览器存储设置后重试');
        }
      }
      setStatus('ready');
    } catch (error) {
      if (error instanceof CorruptDataError) {
        setIssue({
          kind: error.kind,
          message:
            error.kind === 'incompatible'
              ? '当前浏览器中的任务数据版本与这个版本的应用不兼容。原始数据已保留，未被覆盖。'
              : '当前浏览器中的任务数据已损坏，无法读取。原始数据已保留，未被覆盖。',
          raw: error.raw,
        });
        setStatus('issue');
      } else if (error instanceof StorageUnavailableError) {
        setLoadError('无法读取浏览器本地存储。请检查浏览器设置后重试。');
        setStatus('load-error');
      } else {
        setLoadError('无法读取本地数据，请重试。');
        setStatus('load-error');
      }
    }
  }, [applyData]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const readFresh = useCallback((): AppData | null => {
    try {
      const loaded = loadData();
      if (loaded) return loaded;
      return dataRef.current;
    } catch {
      setStorageProblem('无法访问本地存储，请重试');
      return null;
    }
  }, []);

  const commit = useCallback(
    (next: AppData): boolean => {
      try {
        saveData(next);
        applyData(next);
        setStorageProblem(null);
        return true;
      } catch {
        setStorageProblem('保存失败，请重试');
        return false;
      }
    },
    [applyData],
  );

  const createTask = useCallback(
    (input: TaskInput): SaveResult => {
      const fresh = readFresh();
      if (!fresh) return { ok: false, message: '保存失败，请重试' };
      const fieldErrors = validateTaskInput(input, fresh.lists);
      if (hasErrors(fieldErrors)) return { ok: false, fieldErrors };
      const list = findList(fresh, input.listId);
      if (!list) return { ok: false, fieldErrors: { listId: '请选择有效的清单' } };
      const now = nowIso();
      const task: Task = {
        id: createId('task'),
        title: input.title.trim(),
        description: input.description.trim(),
        status: 'open',
        priority: input.priority,
        dueDate: input.dueDate,
        listId: input.listId,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        revision: 1,
      };
      const next: AppData = { ...fresh, tasks: [...fresh.tasks, task] };
      if (!commit(next)) return { ok: false, message: '保存失败，请重试' };
      setFirstRun(false);
      return { ok: true, task, message: `任务已保存到「${list.name}」` };
    },
    [commit, readFresh],
  );

  const updateTask = useCallback(
    (taskId: string, input: TaskInput, expectedRevision: number): SaveResult => {
      const fresh = readFresh();
      if (!fresh) return { ok: false, message: '保存失败，请重试' };
      const latest = fresh.tasks.find((task) => task.id === taskId);
      if (!latest) {
        applyData(fresh);
        return {
          ok: false,
          conflict: {
            kind: 'deleted',
            message: '此任务已在其他页面被删除，请重新载入最新数据。',
          },
        };
      }
      if (latest.revision !== expectedRevision) {
        applyData(fresh);
        return {
          ok: false,
          conflict: {
            kind: 'changed',
            message: '此任务已在其他页面被修改，请重新载入后再编辑。',
          },
        };
      }
      const list = findList(fresh, input.listId);
      if (!list) {
        applyData(fresh);
        return {
          ok: false,
          conflict: {
            kind: 'list-deleted',
            message: '任务原所属清单已被删除，请重新载入最新数据。',
          },
        };
      }
      const fieldErrors = validateTaskInput(input, fresh.lists);
      if (hasErrors(fieldErrors)) return { ok: false, fieldErrors };

      const nextTask: Task = {
        ...latest,
        title: input.title.trim(),
        description: input.description.trim(),
        dueDate: input.dueDate,
        priority: input.priority,
        listId: input.listId,
        updatedAt: nowIso(),
        revision: latest.revision + 1,
      };
      const next: AppData = {
        ...fresh,
        tasks: fresh.tasks.map((task) => (task.id === taskId ? nextTask : task)),
      };
      if (!commit(next)) return { ok: false, message: '保存失败，请重试' };
      return { ok: true, task: nextTask, message: `任务已保存到「${list.name}」` };
    },
    [applyData, commit, readFresh],
  );

  const toggleTask = useCallback(
    (taskId: string): SaveResult => {
      const fresh = readFresh();
      if (!fresh) return { ok: false, message: '保存失败，请重试' };
      const latest = fresh.tasks.find((task) => task.id === taskId);
      if (!latest) {
        applyData(fresh);
        return { ok: false, message: '任务已不存在，已载入最新数据。' };
      }
      const now = nowIso();
      const nextTask: Task =
        latest.status === 'open'
          ? {
              ...latest,
              status: 'completed',
              completedAt: now,
              updatedAt: now,
              revision: latest.revision + 1,
            }
          : {
              ...latest,
              status: 'open',
              completedAt: null,
              updatedAt: now,
              revision: latest.revision + 1,
            };
      const next: AppData = {
        ...fresh,
        tasks: fresh.tasks.map((task) => (task.id === taskId ? nextTask : task)),
      };
      if (!commit(next)) return { ok: false, message: '保存失败，请重试' };
      return {
        ok: true,
        task: nextTask,
        message: nextTask.status === 'completed' ? '任务已完成' : '任务已重新打开',
      };
    },
    [applyData, commit, readFresh],
  );

  const deleteTask = useCallback(
    (taskId: string): SaveResult => {
      const fresh = readFresh();
      if (!fresh) return { ok: false, message: '保存失败，请重试' };
      const exists = fresh.tasks.some((task) => task.id === taskId);
      const next: AppData = {
        ...fresh,
        tasks: fresh.tasks.filter((task) => task.id !== taskId),
      };
      if (!commit(next)) return { ok: false, message: '保存失败，请重试' };
      return {
        ok: true,
        message: exists ? '任务已删除' : '任务已不存在，已载入最新数据',
      };
    },
    [commit, readFresh],
  );

  const createList = useCallback(
    (rawName: string): ListResult => {
      const fresh = readFresh();
      if (!fresh) return { ok: false, message: '保存失败，请重试' };
      const error = validateListName(rawName, fresh.lists);
      if (error) return { ok: false, message: error };
      const list: TodoList = {
        id: createId('list'),
        name: rawName.trim(),
        isSystem: false,
        createdAt: nowIso(),
        revision: 1,
      };
      const next: AppData = { ...fresh, lists: [...fresh.lists, list] };
      if (!commit(next)) return { ok: false, message: '保存失败，请重试' };
      setFirstRun(false);
      return { ok: true, list, message: `清单「${list.name}」已创建` };
    },
    [commit, readFresh],
  );

  const renameList = useCallback(
    (listId: string, rawName: string): ListResult => {
      const fresh = readFresh();
      if (!fresh) return { ok: false, message: '保存失败，请重试' };
      const list = findList(fresh, listId);
      if (!list) {
        applyData(fresh);
        return { ok: false, message: '清单已不存在，请重新载入。' };
      }
      if (list.isSystem) return { ok: false, message: '收集箱不可重命名' };
      const error = validateListName(rawName, fresh.lists, listId);
      if (error) return { ok: false, message: error };
      const nextList: TodoList = {
        ...list,
        name: rawName.trim(),
        revision: list.revision + 1,
      };
      const next: AppData = {
        ...fresh,
        lists: fresh.lists.map((item) => (item.id === listId ? nextList : item)),
      };
      if (!commit(next)) return { ok: false, message: '保存失败，请重试' };
      return { ok: true, list: nextList, message: `清单已重命名为「${nextList.name}」` };
    },
    [applyData, commit, readFresh],
  );

  const deleteList = useCallback(
    (listId: string): ListResult => {
      const fresh = readFresh();
      if (!fresh) return { ok: false, message: '保存失败，请重试' };
      const list = findList(fresh, listId);
      if (!list) {
        applyData(fresh);
        return { ok: false, message: '清单已不存在，请重新载入。' };
      }
      if (list.isSystem) return { ok: false, message: '收集箱不可删除' };
      const affected = fresh.tasks.filter((task) => task.listId === listId);
      const now = nowIso();
      const tasks = fresh.tasks.map((task) =>
        task.listId === listId
          ? {
              ...task,
              listId: INBOX_ID,
              updatedAt: now,
              revision: task.revision + 1,
            }
          : task,
      );
      const next: AppData = {
        ...fresh,
        lists: fresh.lists.filter((item) => item.id !== listId),
        tasks,
      };
      // A single write moves every task and removes the list atomically.
      if (!commit(next)) return { ok: false, message: '保存失败，请重试' };
      return {
        ok: true,
        affectedCount: affected.length,
        message: `清单「${list.name}」已删除，${affected.length} 个任务已移至收集箱`,
      };
    },
    [applyData, commit, readFresh],
  );

  const retryStorage = useCallback((): boolean => {
    try {
      const stored = loadData();
      if (stored) {
        applyData(stored);
      } else {
        const initial = createInitialData();
        saveData(initial);
        applyData(initial);
      }
      setStorageProblem(null);
      return true;
    } catch {
      setStorageProblem('仍无法保存，请检查浏览器存储设置');
      return false;
    }
  }, [applyData]);

  const resetData = useCallback((): boolean => {
    try {
      clearData();
      const initial = createInitialData();
      saveData(initial);
      applyData(initial);
      setIssue(null);
      setLoadError(null);
      setStorageProblem(null);
      setFirstRun(true);
      setStatus('ready');
      return true;
    } catch {
      setStorageProblem('重置失败，无法写入本地存储，请重试');
      return false;
    }
  }, [applyData]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      try {
        if (event.newValue === null) {
          applyData(createInitialData());
        } else {
          applyData(parseStoredData(event.newValue));
        }
        setStorageProblem(null);
      } catch {
        setStorageProblem('其他页面写入了无法读取的数据，请重新载入。');
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [applyData]);

  return {
    data,
    status,
    firstRun,
    issue,
    loadError,
    storageProblem,
    initialize,
    retryStorage,
    resetData,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    createList,
    renameList,
    deleteList,
  };
}
