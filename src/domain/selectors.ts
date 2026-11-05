import { addDays, formatDateLabel } from './date';
import { matchesKeyword } from './text';
import { compareBasic, sortBasic, sortCompleted } from './sort';
import type {
  AppData,
  ListTab,
  PriorityFilter,
  Task,
  ViewKey,
} from './types';

export interface ViewSelection {
  view: ViewKey;
  listId: string | null;
  tab: ListTab;
}

export function taskMatchesView(
  task: Task,
  selection: ViewSelection,
  today: string,
): boolean {
  const { view, listId, tab } = selection;
  switch (view) {
    case 'today':
      return task.status === 'open' && task.dueDate !== null && task.dueDate <= today;
    case 'next7': {
      const tomorrow = addDays(today, 1);
      const last = addDays(today, 7);
      return (
        task.status === 'open' &&
        task.dueDate !== null &&
        task.dueDate >= tomorrow &&
        task.dueDate <= last
      );
    }
    case 'all':
      return task.status === 'open';
    case 'completed':
      return task.status === 'completed';
    case 'list':
      if (!listId) return false;
      return task.listId === listId && task.status === (tab === 'open' ? 'open' : 'completed');
    default:
      return false;
  }
}

export function selectViewTasks(
  tasks: readonly Task[],
  selection: ViewSelection,
  today: string,
): Task[] {
  const selected = tasks.filter((task) => taskMatchesView(task, selection, today));
  return selection.view === 'completed' ||
    (selection.view === 'list' && selection.tab === 'completed')
    ? sortCompleted(selected)
    : sortBasic(selected);
}

export function matchesFilter(
  task: Task,
  search: string,
  priority: PriorityFilter,
): boolean {
  const keyword = search.trim();
  if (priority !== 'all' && task.priority !== priority) return false;
  if (keyword.length === 0) return true;
  // Title and notes are matched with a single case-insensitive substring.
  return matchesKeyword(task.title, keyword) || matchesKeyword(task.description, keyword);
}

export function selectVisibleTasks(
  tasks: readonly Task[],
  selection: ViewSelection,
  today: string,
  search: string,
  priority: PriorityFilter,
): Task[] {
  return selectViewTasks(tasks, selection, today).filter((task) =>
    matchesFilter(task, search, priority),
  );
}

export interface NavCounts {
  today: number;
  next7: number;
  all: number;
  completed: number;
  lists: Record<string, number>;
}

export function computeNavCounts(tasks: readonly Task[], today: string): NavCounts {
  const counts: NavCounts = { today: 0, next7: 0, all: 0, completed: 0, lists: {} };
  const tomorrow = addDays(today, 1);
  const last = addDays(today, 7);
  for (const task of tasks) {
    if (task.status === 'completed') {
      counts.completed += 1;
      continue;
    }
    counts.all += 1;
    counts.lists[task.listId] = (counts.lists[task.listId] ?? 0) + 1;
    if (task.dueDate !== null) {
      if (task.dueDate <= today) counts.today += 1;
      if (task.dueDate >= tomorrow && task.dueDate <= last) counts.next7 += 1;
    }
  }
  return counts;
}

export interface TaskGroup {
  key: string;
  label: string | null;
  kind: 'overdue' | 'today' | 'date' | 'plain';
  tasks: Task[];
}

/**
 * Group visible tasks. Today splits into overdue/today; next 7 days groups by
 * date ascending; the other views are a single unlabeled list.
 */
export function groupVisibleTasks(
  tasks: readonly Task[],
  selection: ViewSelection,
  today: string,
): TaskGroup[] {
  if (selection.view === 'today') {
    const overdue = tasks
      .filter((task) => task.dueDate !== null && task.dueDate < today)
      .sort(compareBasic);
    const dueToday = tasks
      .filter((task) => task.dueDate === today)
      .sort(compareBasic);
    const groups: TaskGroup[] = [];
    if (overdue.length > 0) {
      groups.push({ key: 'overdue', label: '已逾期', kind: 'overdue', tasks: overdue });
    }
    if (dueToday.length > 0) {
      groups.push({ key: 'today', label: '今天', kind: 'today', tasks: dueToday });
    }
    return groups;
  }

  if (selection.view === 'next7') {
    const byDate = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const bucket = byDate.get(task.dueDate);
      if (bucket) bucket.push(task);
      else byDate.set(task.dueDate, [task]);
    }
    return [...byDate.keys()]
      .sort()
      .map((key) => ({
        key,
        label: formatDateLabel(key, today),
        kind: 'date' as const,
        tasks: sortBasic(byDate.get(key) ?? []),
      }));
  }

  return [{ key: 'all', label: null, kind: 'plain', tasks: [...tasks] }];
}

export function taskListName(data: AppData, listId: string): string {
  return data.lists.find((list) => list.id === listId)?.name ?? '收集箱';
}
