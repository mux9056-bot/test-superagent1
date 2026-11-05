import type { Priority, Task } from '../domain/types';

let sequence = 0;

export function makeTask(overrides: Partial<Task> = {}): Task {
  sequence += 1;
  return {
    id: `task-${String(sequence).padStart(3, '0')}`,
    title: `任务 ${sequence}`,
    description: '',
    status: 'open',
    priority: 'medium' as Priority,
    dueDate: null,
    listId: 'inbox',
    createdAt: `2026-11-0${Math.min(sequence, 9)}T00:00:00.000Z`,
    updatedAt: '2026-11-05T00:00:00.000Z',
    completedAt: null,
    revision: 1,
    ...overrides,
  };
}
