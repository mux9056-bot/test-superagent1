import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTodoStore } from './useTodoStore';
import { STORAGE_KEY, parseStoredData } from '../storage/storage';
import type { AppData } from '../domain/types';

function stored(): AppData {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) throw new Error('no stored data');
  return parseStoredData(raw);
}

async function setup() {
  const hook = renderHook(() => useTodoStore());
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));
  return hook;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('task mutations', () => {
  it('creates a task, persists it, and allows duplicate titles', async () => {
    const { result } = await setup();
    let firstId = '';
    act(() => {
      const res = result.current.createTask({
        title: '  写周报  ',
        description: ' 内容 ',
        dueDate: '2026-11-05',
        priority: 'high',
        listId: 'inbox',
      });
      expect(res.ok).toBe(true);
      firstId = res.task!.id;
    });
    act(() => {
      const res = result.current.createTask({
        title: '写周报',
        description: '',
        dueDate: null,
        priority: 'medium',
        listId: 'inbox',
      });
      expect(res.ok).toBe(true);
    });

    const saved = stored();
    expect(saved.tasks).toHaveLength(2);
    expect(saved.tasks[0]).toMatchObject({
      title: '写周报',
      description: '内容',
      status: 'open',
      priority: 'high',
      dueDate: '2026-11-05',
      listId: 'inbox',
      completedAt: null,
      revision: 1,
    });
    expect(saved.tasks[0].id).toBe(firstId);
    expect(saved.tasks[0].createdAt).toBeTruthy();
  });

  it('rejects blank titles without writing', async () => {
    const { result } = await setup();
    let outcome: ReturnType<typeof result.current.createTask> | undefined;
    act(() => {
      outcome = result.current.createTask({
        title: '   ',
        description: '',
        dueDate: null,
        priority: 'medium',
        listId: 'inbox',
      });
    });
    expect(outcome?.ok).toBe(false);
    expect(outcome?.fieldErrors?.title).toBe('请输入任务标题');
    expect(stored().tasks).toHaveLength(0);
  });

  it('persists status changes with completion time and clears it on reopen', async () => {
    const { result } = await setup();
    let taskId = '';
    act(() => {
      taskId = result.current.createTask({
        title: '任务',
        description: '',
        dueDate: null,
        priority: 'medium',
        listId: 'inbox',
      }).task!.id;
    });

    act(() => {
      const res = result.current.toggleTask(taskId);
      expect(res.ok).toBe(true);
      expect(res.task?.status).toBe('completed');
      expect(res.task?.completedAt).toBeTruthy();
    });
    expect(stored().tasks[0].status).toBe('completed');
    expect(stored().tasks[0].completedAt).toBeTruthy();

    act(() => {
      const res = result.current.toggleTask(taskId);
      expect(res.ok).toBe(true);
      expect(res.task?.status).toBe('open');
      expect(res.task?.completedAt).toBeNull();
    });
    expect(stored().tasks[0].completedAt).toBeNull();
    expect(stored().tasks[0].revision).toBe(3);
  });

  it('updates every editable field and increments the revision', async () => {
    const { result } = await setup();
    let taskId = '';
    let revision = 1;
    act(() => {
      const res = result.current.createTask({
        title: '旧标题',
        description: '',
        dueDate: null,
        priority: 'low',
        listId: 'inbox',
      });
      taskId = res.task!.id;
      revision = res.task!.revision;
    });
    act(() => {
      const res = result.current.updateTask(
        taskId,
        {
          title: '新标题',
          description: '备注',
          dueDate: '2026-11-08',
          priority: 'high',
          listId: 'inbox',
        },
        revision,
      );
      expect(res.ok).toBe(true);
    });
    const task = stored().tasks[0];
    expect(task).toMatchObject({
      title: '新标题',
      description: '备注',
      dueDate: '2026-11-08',
      priority: 'high',
      revision: 2,
    });
    expect(task.createdAt).toBeTruthy();
  });
});

describe('conflict detection', () => {
  it('does not overwrite a task changed in another tab', async () => {
    const { result } = await setup();
    let taskId = '';
    act(() => {
      taskId = result.current.createTask({
        title: '原任务',
        description: '',
        dueDate: null,
        priority: 'medium',
        listId: 'inbox',
      }).task!.id;
    });

    // Simulate another tab saving a newer revision.
    const external = stored();
    external.tasks[0] = { ...external.tasks[0], title: '其他页面的标题', revision: 2 };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(external));

    let conflict: string | undefined;
    act(() => {
      const res = result.current.updateTask(
        taskId,
        { title: '我的标题', description: '', dueDate: null, priority: 'medium', listId: 'inbox' },
        1,
      );
      expect(res.ok).toBe(false);
      conflict = res.conflict?.kind;
    });
    expect(conflict).toBe('changed');
    expect(stored().tasks[0].title).toBe('其他页面的标题');
  });

  it('does not resurrect a task deleted in another tab', async () => {
    const { result } = await setup();
    let taskId = '';
    act(() => {
      taskId = result.current.createTask({
        title: '原任务',
        description: '',
        dueDate: null,
        priority: 'medium',
        listId: 'inbox',
      }).task!.id;
    });

    const external = stored();
    external.tasks = [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(external));

    let conflict: string | undefined;
    act(() => {
      const res = result.current.updateTask(
        taskId,
        { title: '我的标题', description: '', dueDate: null, priority: 'medium', listId: 'inbox' },
        1,
      );
      expect(res.ok).toBe(false);
      conflict = res.conflict?.kind;
    });
    expect(conflict).toBe('deleted');
    expect(stored().tasks).toHaveLength(0);
  });
});

describe('list operations', () => {
  it('moves every task to Inbox and deletes the list in one atomic write', async () => {
    const { result } = await setup();
    let listId = '';
    act(() => {
      listId = result.current.createList('工作').list!.id;
    });
    let openId = '';
    let doneId = '';
    act(() => {
      openId = result.current.createTask({
        title: '未完成',
        description: '',
        dueDate: null,
        priority: 'medium',
        listId,
      }).task!.id;
      doneId = result.current.createTask({
        title: '已完成',
        description: '',
        dueDate: null,
        priority: 'medium',
        listId,
      }).task!.id;
      result.current.toggleTask(doneId);
    });

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    let affected = 0;
    act(() => {
      const res = result.current.deleteList(listId);
      expect(res.ok).toBe(true);
      affected = res.affectedCount ?? 0;
    });
    expect(affected).toBe(2);
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    setItemSpy.mockRestore();

    const saved = stored();
    expect(saved.lists.some((list) => list.id === listId)).toBe(false);
    expect(saved.tasks).toHaveLength(2);
    const byId = Object.fromEntries(saved.tasks.map((task) => [task.id, task]));
    expect(byId[openId].listId).toBe('inbox');
    expect(byId[doneId].listId).toBe('inbox');
    expect(byId[doneId].status).toBe('completed');
    expect(byId[doneId].completedAt).toBeTruthy();
    expect(byId[openId].revision).toBe(2);
    expect(byId[doneId].revision).toBe(3);
  });

  it('rejects duplicate names case-insensitively and protects Inbox', async () => {
    const { result } = await setup();
    act(() => {
      expect(result.current.createList('Work').ok).toBe(true);
    });
    act(() => {
      const res = result.current.createList('WORK');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('已存在同名清单');
    });
    act(() => {
      const res = result.current.renameList('inbox', '新的收集箱');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('收集箱不可重命名');
    });
    act(() => {
      const res = result.current.deleteList('inbox');
      expect(res.ok).toBe(false);
      expect(res.message).toBe('收集箱不可删除');
    });
  });
});

describe('storage failures', () => {
  it('keeps the saved state when a write fails', async () => {
    const { result } = await setup();
    let taskId = '';
    act(() => {
      taskId = result.current.createTask({
        title: '任务',
        description: '',
        dueDate: null,
        priority: 'medium',
        listId: 'inbox',
      }).task!.id;
    });

    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });

    let outcome: ReturnType<typeof result.current.toggleTask> | undefined;
    act(() => {
      outcome = result.current.toggleTask(taskId);
    });
    expect(outcome?.ok).toBe(false);
    expect(outcome?.message).toBe('保存失败，请重试');
    expect(stored().tasks[0].status).toBe('open');
    expect(result.current.storageProblem).toBe('保存失败，请重试');

    setItemSpy.mockRestore();
    act(() => {
      expect(result.current.retryStorage()).toBe(true);
    });
    expect(result.current.storageProblem).toBeNull();
  });
});
