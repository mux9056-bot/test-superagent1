export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'open' | 'completed';
export type ListTab = 'open' | 'completed';
export type ViewKey = 'today' | 'next7' | 'all' | 'completed' | 'list';
export type PriorityFilter = 'all' | Priority;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  /** Calendar date in YYYY-MM-DD form, or null when no due date is set. */
  dueDate: string | null;
  listId: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
  /** ISO timestamp when completed, otherwise null. */
  completedAt: string | null;
  /** Incremented on every successful change; used for conflict detection. */
  revision: number;
}

export interface TodoList {
  id: string;
  name: string;
  isSystem: boolean;
  createdAt: string;
  revision: number;
}

export interface AppData {
  formatVersion: 1;
  lists: TodoList[];
  tasks: Task[];
}

export interface TaskInput {
  title: string;
  description: string;
  dueDate: string | null;
  priority: Priority;
  listId: string;
}

export const INBOX_ID = 'inbox';

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const PRIORITY_OPTIONS: Priority[] = ['high', 'medium', 'low'];

export type DataIssue = 'corrupt' | 'incompatible' | 'unavailable';

export interface ConflictInfo {
  kind: 'changed' | 'deleted' | 'list-deleted';
  message: string;
}
