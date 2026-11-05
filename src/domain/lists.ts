import { INBOX_ID, type TodoList } from './types';

/** Inbox first, then custom lists oldest first, as the product rules require. */
export function orderedLists(lists: readonly TodoList[]): TodoList[] {
  const inbox = lists.find((list) => list.id === INBOX_ID);
  const custom = lists
    .filter((list) => list.id !== INBOX_ID)
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
  return inbox ? [inbox, ...custom] : custom;
}

export function customLists(lists: readonly TodoList[]): TodoList[] {
  return orderedLists(lists).filter((list) => list.id !== INBOX_ID);
}
