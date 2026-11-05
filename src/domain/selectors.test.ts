import { describe, expect, it } from 'vitest';
import {
  computeNavCounts,
  groupVisibleTasks,
  matchesFilter,
  selectViewTasks,
  selectVisibleTasks,
} from './selectors';
import type { Task } from './types';
import type { ViewSelection } from './selectors';
import { makeTask } from '../test/factories';

const today = '2026-11-05';

function visibleIds(tasks: Task[], selection: ViewSelection = { view: 'today', listId: null, tab: 'open' }) {
  return selectViewTasks(tasks, selection, today).map((task) => task.title);
}

describe('view selection', () => {
  const tasks = [
    makeTask({ title: '昨天', dueDate: '2026-11-04' }),
    makeTask({ title: '今天', dueDate: '2026-11-05' }),
    makeTask({ title: '明天', dueDate: '2026-11-06' }),
    makeTask({ title: '第7天', dueDate: '2026-11-12' }),
    makeTask({ title: '第8天', dueDate: '2026-11-13' }),
    makeTask({ title: '无日期' }),
    makeTask({ title: '已完成', dueDate: '2026-11-05', status: 'completed', completedAt: '2026-11-05T08:00:00.000Z' }),
    makeTask({ title: '清单', listId: 'work', dueDate: '2026-11-20' }),
  ];

  it('today contains overdue and today tasks only, not undated tasks', () => {
    expect(visibleIds(tasks)).toEqual(['昨天', '今天']);
  });

  it('next 7 days includes tomorrow through day 7 inclusive', () => {
    expect(
      visibleIds(tasks, { view: 'next7', listId: null, tab: 'open' }),
    ).toEqual(['明天', '第7天']);
  });

  it('all includes every open task, including undated', () => {
    expect(
      visibleIds(tasks, { view: 'all', listId: null, tab: 'open' }),
    ).toEqual(['昨天', '今天', '明天', '第7天', '第8天', '清单', '无日期']);
  });

  it('completed only includes completed tasks', () => {
    expect(
      visibleIds(tasks, { view: 'completed', listId: null, tab: 'open' }),
    ).toEqual(['已完成']);
  });

  it('list tabs filter by list and status', () => {
    expect(
      visibleIds(tasks, { view: 'list', listId: 'work', tab: 'open' }),
    ).toEqual(['清单']);
    expect(
      visibleIds(tasks, { view: 'list', listId: 'work', tab: 'completed' }),
    ).toEqual([]);
  });
});

describe('grouping', () => {
  it('splits today into overdue then today and hides empty groups', () => {
    const tasks = [
      makeTask({ title: '今天低', dueDate: '2026-11-05', priority: 'low' }),
      makeTask({ title: '昨天', dueDate: '2026-11-04' }),
      makeTask({ title: '今天高', dueDate: '2026-11-05', priority: 'high' }),
    ];
    const selected = selectViewTasks(tasks, { view: 'today', listId: null, tab: 'open' }, today);
    const groups = groupVisibleTasks(selected, { view: 'today', listId: null, tab: 'open' }, today);
    expect(groups.map((group) => group.label)).toEqual(['已逾期', '今天']);
    expect(groups[0].tasks.map((task) => task.title)).toEqual(['昨天']);
    expect(groups[1].tasks.map((task) => task.title)).toEqual(['今天高', '今天低']);

    const noOverdue = tasks.filter((task) => task.dueDate === '2026-11-05');
    const groups2 = groupVisibleTasks(
      selectViewTasks(noOverdue, { view: 'today', listId: null, tab: 'open' }, today),
      { view: 'today', listId: null, tab: 'open' },
      today,
    );
    expect(groups2.map((group) => group.label)).toEqual(['今天']);
  });

  it('groups next 7 days by date ascending without empty dates', () => {
    const tasks = [
      makeTask({ title: '明天', dueDate: '2026-11-06' }),
      makeTask({ title: '第7天', dueDate: '2026-11-12' }),
      makeTask({ title: '明天2', dueDate: '2026-11-06', priority: 'high' }),
    ];
    const groups = groupVisibleTasks(
      selectViewTasks(tasks, { view: 'next7', listId: null, tab: 'open' }, today),
      { view: 'next7', listId: null, tab: 'open' },
      today,
    );
    expect(groups.map((group) => group.label)).toEqual(['明天', '11月12日 周四']);
    expect(groups[0].tasks.map((task) => task.title)).toEqual(['明天2', '明天']);
  });
});

describe('search and priority filter', () => {
  const tasks = [
    makeTask({ title: '写周报', description: '包含 OKR 内容', priority: 'high' }),
    makeTask({ title: '买牛奶', description: '', priority: 'low' }),
    makeTask({ title: 'Read Book', description: 'English NOTES', priority: 'medium' }),
  ];

  it('matches title or notes with a trimmed case-insensitive substring', () => {
    expect(tasks.filter((task) => matchesFilter(task, ' okr ', 'all')).map((task) => task.title)).toEqual([
      '写周报',
    ]);
    expect(tasks.filter((task) => matchesFilter(task, 'book', 'all')).map((task) => task.title)).toEqual([
      'Read Book',
    ]);
    expect(tasks.filter((task) => matchesFilter(task, 'notes', 'all')).map((task) => task.title)).toEqual([
      'Read Book',
    ]);
  });

  it('intersects search with priority and keeps view ordering', () => {
    const result = selectVisibleTasks(
      tasks,
      { view: 'all', listId: null, tab: 'open' },
      today,
      '',
      'high',
    );
    expect(result.map((task) => task.title)).toEqual(['写周报']);

    const both = selectVisibleTasks(
      tasks,
      { view: 'all', listId: null, tab: 'open' },
      today,
      'book',
      'high',
    );
    expect(both).toEqual([]);
  });
});

describe('navigation counts', () => {
  it('counts open tasks per view and completed total, ignoring filters', () => {
    const tasks = [
      makeTask({ title: '昨天', dueDate: '2026-11-04', listId: 'inbox' }),
      makeTask({ title: '今天', dueDate: '2026-11-05', listId: 'work' }),
      makeTask({ title: '明天', dueDate: '2026-11-06', listId: 'work' }),
      makeTask({ title: '第7天', dueDate: '2026-11-12', listId: 'inbox' }),
      makeTask({ title: '无日期', listId: 'inbox' }),
      makeTask({
        title: '已完成',
        status: 'completed',
        completedAt: '2026-11-05T08:00:00.000Z',
        listId: 'inbox',
      }),
    ];
    const counts = computeNavCounts(tasks, today);
    expect(counts.today).toBe(2);
    expect(counts.next7).toBe(2);
    expect(counts.all).toBe(5);
    expect(counts.completed).toBe(1);
    expect(counts.lists).toEqual({ inbox: 3, work: 2 });
  });
});
