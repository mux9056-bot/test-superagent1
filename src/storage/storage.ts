import { isValidDateKey } from '../domain/date';
import type { AppData, Task, TodoList } from '../domain/types';
import { INBOX_ID } from '../domain/types';

export const STORAGE_KEY = 'todo-app.data.v1';
export const FORMAT_VERSION = 1;

export class StorageUnavailableError extends Error {
  constructor(message = '无法访问浏览器本地存储') {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

export class CorruptDataError extends Error {
  readonly kind: 'corrupt' | 'incompatible';
  readonly raw: string | null;

  constructor(kind: 'corrupt' | 'incompatible', raw: string | null, message?: string) {
    super(
      message ??
        (kind === 'incompatible'
          ? '本地数据版本不受支持'
          : '本地数据已损坏或格式不正确'),
    );
    this.name = 'CorruptDataError';
    this.kind = kind;
    this.raw = raw;
  }
}

function resolveStorage(): Storage {
  try {
    if (typeof window === 'undefined') throw new Error('no window');
    const storage = window.localStorage;
    if (!storage) throw new Error('no localStorage');
    return storage;
  } catch {
    throw new StorageUnavailableError();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseList(value: unknown): TodoList | null {
  if (!isRecord(value)) return null;
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    typeof value.isSystem !== 'boolean' ||
    !isTimestamp(value.createdAt) ||
    !isRevision(value.revision)
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    isSystem: value.isSystem,
    createdAt: value.createdAt,
    revision: value.revision,
  };
}

function parseTask(value: unknown, listIds: ReadonlySet<string>): Task | null {
  if (!isRecord(value)) return null;
  const {
    id,
    title,
    description,
    status,
    priority,
    dueDate,
    listId,
    createdAt,
    updatedAt,
    completedAt,
    revision,
  } = value;
  if (
    !isNonEmptyString(id) ||
    typeof title !== 'string' ||
    typeof description !== 'string' ||
    (status !== 'open' && status !== 'completed') ||
    (priority !== 'high' && priority !== 'medium' && priority !== 'low') ||
    !(dueDate === null || isValidDateKey(dueDate)) ||
    !isNonEmptyString(listId) ||
    !listIds.has(listId) ||
    !isTimestamp(createdAt) ||
    !isTimestamp(updatedAt) ||
    !isRevision(revision)
  ) {
    return null;
  }
  if (completedAt !== null && !isTimestamp(completedAt)) return null;
  if (status === 'completed' && completedAt === null) return null;
  if (status === 'open' && completedAt !== null) return null;
  return {
    id,
    title,
    description,
    status,
    priority,
    dueDate,
    listId,
    createdAt,
    updatedAt,
    completedAt,
    revision,
  };
}

/**
 * Parse stored JSON into app data. Throws CorruptDataError for malformed data
 * and for a format version this build cannot read; never silently drops data.
 */
export function parseStoredData(raw: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CorruptDataError('corrupt', raw, '本地数据无法解析');
  }
  if (!isRecord(parsed) || typeof parsed.formatVersion !== 'number') {
    throw new CorruptDataError('corrupt', raw);
  }
  if (parsed.formatVersion !== FORMAT_VERSION) {
    throw new CorruptDataError('incompatible', raw);
  }
  if (!Array.isArray(parsed.lists) || !Array.isArray(parsed.tasks)) {
    throw new CorruptDataError('corrupt', raw);
  }

  const lists: TodoList[] = [];
  for (const item of parsed.lists) {
    const list = parseList(item);
    if (!list) throw new CorruptDataError('corrupt', raw);
    lists.push(list);
  }
  const listIds = new Set(lists.map((list) => list.id));
  if (listIds.size !== lists.length) throw new CorruptDataError('corrupt', raw);
  const inbox = lists.find((list) => list.id === INBOX_ID);
  if (!inbox || !inbox.isSystem) throw new CorruptDataError('corrupt', raw);

  const tasks: Task[] = [];
  for (const item of parsed.tasks) {
    const task = parseTask(item, listIds);
    if (!task) throw new CorruptDataError('corrupt', raw);
    tasks.push(task);
  }
  if (new Set(tasks.map((task) => task.id)).size !== tasks.length) {
    throw new CorruptDataError('corrupt', raw);
  }

  return { formatVersion: FORMAT_VERSION, lists, tasks };
}

/** Read the stored dataset; null means this browser has no data yet. */
export function loadData(storageOverride?: Storage): AppData | null {
  const storage = storageOverride ?? resolveStorage();
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    throw new StorageUnavailableError();
  }
  if (raw === null) return null;
  return parseStoredData(raw);
}

/** Persist the full dataset; throws StorageUnavailableError when it cannot. */
export function saveData(data: AppData, storageOverride?: Storage): void {
  const storage = storageOverride ?? resolveStorage();
  const serialized = JSON.stringify(data);
  try {
    storage.setItem(STORAGE_KEY, serialized);
  } catch {
    throw new StorageUnavailableError('保存失败，请重试');
  }
}

export function clearData(storageOverride?: Storage): void {
  const storage = storageOverride ?? resolveStorage();
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    throw new StorageUnavailableError();
  }
}

export function createInitialData(now: string = new Date().toISOString()): AppData {
  return {
    formatVersion: FORMAT_VERSION,
    lists: [
      {
        id: INBOX_ID,
        name: '收集箱',
        isSystem: true,
        createdAt: now,
        revision: 1,
      },
    ],
    tasks: [],
  };
}
