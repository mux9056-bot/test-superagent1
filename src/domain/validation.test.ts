import { describe, expect, it } from 'vitest';
import { hasErrors, validateListName, validateTaskInput } from './validation';
import type { TaskInput, TodoList } from './types';

const lists: TodoList[] = [
  {
    id: 'inbox',
    name: '收集箱',
    isSystem: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    revision: 1,
  },
  {
    id: 'work',
    name: 'Work',
    isSystem: false,
    createdAt: '2026-11-02T00:00:00.000Z',
    revision: 1,
  },
];

function input(overrides: Partial<TaskInput> = {}): TaskInput {
  return {
    title: '写周报',
    description: '',
    dueDate: null,
    priority: 'medium',
    listId: 'inbox',
    ...overrides,
  };
}

describe('task validation', () => {
  it('requires a non-blank title', () => {
    const errors = validateTaskInput(input({ title: '   ' }), lists);
    expect(errors.title).toBe('请输入任务标题');
    expect(hasErrors(errors)).toBe(true);
  });

  it('limits titles to 200 visible characters, counting emoji as one', () => {
    expect(validateTaskInput(input({ title: '😀'.repeat(200) }), lists)).toEqual({});
    const errors = validateTaskInput(input({ title: '😀'.repeat(201) }), lists);
    expect(errors.title).toContain('200');
  });

  it('limits notes to 5,000 visible characters', () => {
    expect(validateTaskInput(input({ description: '字'.repeat(5000) }), lists)).toEqual({});
    const errors = validateTaskInput(input({ description: '字'.repeat(5001) }), lists);
    expect(errors.description).toContain('5000');
  });

  it('rejects invalid dates and unknown lists', () => {
    const errors = validateTaskInput(
      input({ dueDate: '2026-02-30', listId: 'missing' }),
      lists,
    );
    expect(errors.dueDate).toBe('请选择有效的日期');
    expect(errors.listId).toBe('请选择有效的清单');
  });

  it('accepts past, present and future dates', () => {
    for (const dueDate of ['2020-01-01', '2026-11-05', '2030-12-31']) {
      expect(validateTaskInput(input({ dueDate }), lists)).toEqual({});
    }
  });

  it('allows duplicate task titles', () => {
    expect(validateTaskInput(input({ title: '写周报' }), lists)).toEqual({});
  });
});

describe('list name validation', () => {
  it('requires 1-30 visible characters', () => {
    expect(validateListName('', lists)).toBe('请输入清单名称');
    expect(validateListName('   ', lists)).toBe('请输入清单名称');
    expect(validateListName('字'.repeat(30), lists)).toBeNull();
    expect(validateListName('字'.repeat(31), lists)).toContain('30');
  });

  it('ignores English case but not internal spaces when detecting duplicates', () => {
    expect(validateListName('work', lists)).toBe('已存在同名清单');
    expect(validateListName('WORK', lists)).toBe('已存在同名清单');
    expect(validateListName('Wo rk', lists)).toBeNull();
    expect(validateListName('work', lists, 'work')).toBeNull();
  });

  it('never allows another 收集箱', () => {
    expect(validateListName('收集箱', lists)).toBe('清单名称不能与「收集箱」重复');
    expect(validateListName(' 收集箱 ', lists)).toBe('清单名称不能与「收集箱」重复');
  });
});
