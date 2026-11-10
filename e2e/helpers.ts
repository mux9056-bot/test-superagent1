import type { Page } from '@playwright/test';
import type { AppData, Task, TodoList } from '../src/domain/types';

export const STORAGE_KEY = 'todo-app.data.v1';

export function dateKey(offsetDays = 0): string {
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays),
  );
  return date.toISOString().slice(0, 10);
}

export function inbox(): TodoList {
  return {
    id: 'inbox',
    name: '收集箱',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    revision: 1,
  };
}

export function buildData(input: {
  tasks?: Array<Partial<Task> & { title: string }>;
  lists?: Array<Partial<TodoList> & { name: string }>;
}): AppData {
  const lists: TodoList[] = [
    inbox(),
    ...(input.lists ?? []).map((list, index) => ({
      id: list.id ?? `list-${index + 1}`,
      name: list.name,
      isSystem: list.isSystem ?? false,
      createdAt: list.createdAt ?? `2026-01-02T00:00:0${Math.min(index, 9)}.000Z`,
      revision: list.revision ?? 1,
    })),
  ];
  const tasks: Task[] = (input.tasks ?? []).map((task, index) => ({
    id: task.id ?? `task-${index + 1}`,
    title: task.title,
    description: task.description ?? '',
    status: task.status ?? 'open',
    priority: task.priority ?? 'medium',
    dueDate: task.dueDate ?? null,
    listId: task.listId ?? 'inbox',
    createdAt: task.createdAt ?? `2026-01-03T00:00:${String(index % 60).padStart(2, '0')}.000Z`,
    updatedAt: task.updatedAt ?? '2026-01-03T00:00:00.000Z',
    completedAt:
      task.completedAt ??
      (task.status === 'completed' ? '2026-01-04T00:00:00.000Z' : null),
    revision: task.revision ?? 1,
  }));
  return { formatVersion: 1, lists, tasks };
}

/**
 * Seed storage before the app boots. Existing data is kept so reloads in a test
 * observe the mutations made through the UI.
 */
export async function seed(page: Page, data: AppData): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, value);
      }
    },
    { key: STORAGE_KEY, value: JSON.stringify(data) },
  );
}

export async function createTaskViaUi(page: Page, title: string): Promise<void> {
  await page.getByRole('banner').getByRole('button', { name: '添加' }).click();
  const dialog = page.getByRole('dialog', { name: '新增任务' });
  await dialog.getByLabel('标题').fill(title);
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
}

export function nav(page: Page) {
  return page.getByRole('complementary', { name: '任务导航' });
}
