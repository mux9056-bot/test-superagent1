import type { Task } from './types';
import { PRIORITY_RANK } from './types';

function compareId(a: Task, b: Task): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function compareCreatedDesc(a: Task, b: Task): number {
  if (a.createdAt === b.createdAt) return compareId(a, b);
  return a.createdAt < b.createdAt ? 1 : -1;
}

/**
 * Base ordering: dated tasks first (earliest date first); same date by
 * high/medium/low priority; then newest created first; undated last with the
 * same priority/creation ordering. The unique id is the final stable tiebreak.
 */
export function compareBasic(a: Task, b: Task): number {
  if (a.dueDate && b.dueDate) {
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  } else if (a.dueDate) {
    return -1;
  } else if (b.dueDate) {
    return 1;
  }

  const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priority !== 0) return priority;

  return compareCreatedDesc(a, b);
}

/** Completed ordering: completion time descending, then creation time descending. */
export function compareCompleted(a: Task, b: Task): number {
  const aAt = a.completedAt ?? a.updatedAt;
  const bAt = b.completedAt ?? b.updatedAt;
  if (aAt !== bAt) return aAt < bAt ? 1 : -1;
  return compareCreatedDesc(a, b);
}

export function sortBasic(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(compareBasic);
}

export function sortCompleted(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(compareCompleted);
}
