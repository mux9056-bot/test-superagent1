import { describe, expect, it } from 'vitest';
import {
  CorruptDataError,
  StorageUnavailableError,
  createInitialData,
  loadData,
  parseStoredData,
  saveData,
  STORAGE_KEY,
} from './storage';
import type { AppData } from '../domain/types';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

function initial(): AppData {
  return createInitialData('2026-11-05T00:00:00.000Z');
}

describe('stored data parsing', () => {
  it('round-trips a valid dataset', () => {
    const storage = new MemoryStorage();
    const data = initial();
    saveData(data, storage);
    expect(loadData(storage)).toEqual(data);
  });

  it('returns null when the browser has no data', () => {
    expect(loadData(new MemoryStorage())).toBeNull();
  });

  it('rejects malformed JSON without discarding the raw value', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    try {
      loadData(storage);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CorruptDataError);
      expect((error as CorruptDataError).kind).toBe('corrupt');
      expect((error as CorruptDataError).raw).toBe('{not json');
    }
  });

  it('treats a different format version as incompatible', () => {
    const raw = JSON.stringify({ ...initial(), formatVersion: 2 });
    try {
      parseStoredData(raw);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CorruptDataError);
      expect((error as CorruptDataError).kind).toBe('incompatible');
    }
  });

  it('rejects missing Inbox, orphaned lists and inconsistent completion data', () => {
    const withoutInbox = initial();
    withoutInbox.lists = [];
    expect(() => parseStoredData(JSON.stringify(withoutInbox))).toThrow(CorruptDataError);

    const orphan = initial();
    orphan.tasks.push({
      id: 't1',
      title: 'x',
      description: '',
      status: 'open',
      priority: 'medium',
      dueDate: null,
      listId: 'missing',
      createdAt: '2026-11-05T00:00:00.000Z',
      updatedAt: '2026-11-05T00:00:00.000Z',
      completedAt: null,
      revision: 1,
    });
    expect(() => parseStoredData(JSON.stringify(orphan))).toThrow(CorruptDataError);

    const badCompletion = initial();
    badCompletion.tasks.push({
      id: 't1',
      title: 'x',
      description: '',
      status: 'completed',
      priority: 'medium',
      dueDate: null,
      listId: 'inbox',
      createdAt: '2026-11-05T00:00:00.000Z',
      updatedAt: '2026-11-05T00:00:00.000Z',
      completedAt: null,
      revision: 1,
    });
    expect(() => parseStoredData(JSON.stringify(badCompletion))).toThrow(CorruptDataError);
  });

  it('reports storage failures instead of succeeding silently', () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError');
    };
    expect(() => saveData(initial(), storage)).toThrow(StorageUnavailableError);
  });
});
