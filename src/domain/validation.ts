import { isValidDateKey } from './date';
import { countVisibleChars, nameKey } from './text';
import type { TaskInput, TodoList } from './types';
import { INBOX_ID } from './types';

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 5000;
export const LIST_NAME_MAX = 30;

export interface TaskFieldErrors {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  listId?: string;
}

export function validateTaskInput(
  input: TaskInput,
  lists: readonly TodoList[],
): TaskFieldErrors {
  const errors: TaskFieldErrors = {};
  const title = input.title.trim();
  if (title.length === 0) {
    errors.title = '请输入任务标题';
  } else {
    const length = countVisibleChars(title);
    if (length > TITLE_MAX) {
      errors.title = `标题最多 ${TITLE_MAX} 个字符，当前 ${length} 个`;
    }
  }

  const description = input.description.trim();
  if (countVisibleChars(description) > DESCRIPTION_MAX) {
    errors.description = `备注最多 ${DESCRIPTION_MAX} 个字符，当前 ${countVisibleChars(description)} 个`;
  }

  if (input.dueDate !== null && !isValidDateKey(input.dueDate)) {
    errors.dueDate = '请选择有效的日期';
  }

  if (!['high', 'medium', 'low'].includes(input.priority)) {
    errors.priority = '请选择优先级';
  }

  if (!lists.some((list) => list.id === input.listId)) {
    errors.listId = '请选择有效的清单';
  }

  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

/** Validate a new or renamed list; returns an error message or null. */
export function validateListName(
  rawName: string,
  lists: readonly TodoList[],
  excludeListId?: string,
): string | null {
  const name = rawName.trim();
  if (name.length === 0) return '请输入清单名称';
  const length = countVisibleChars(name);
  if (length > LIST_NAME_MAX) {
    return `清单名称最多 ${LIST_NAME_MAX} 个字符，当前 ${length} 个`;
  }
  const key = nameKey(name);
  if (key === nameKey('收集箱')) {
    return '清单名称不能与「收集箱」重复';
  }
  const duplicated = lists.some(
    (list) => list.id !== excludeListId && list.id !== INBOX_ID && nameKey(list.name) === key,
  );
  if (duplicated) return '已存在同名清单';
  return null;
}
