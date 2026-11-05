import { describe, expect, it } from 'vitest';
import { compareBasic, sortBasic, sortCompleted } from './sort';
import { makeTask } from '../test/factories';

describe('basic task ordering', () => {
  it('puts dated tasks first and orders dates ascending', () => {
    const later = makeTask({ dueDate: '2026-11-07' });
    const earlier = makeTask({ dueDate: '2026-11-05' });
    const undated = makeTask();
    const sorted = sortBasic([undated, later, earlier]);
    expect(sorted.map((task) => task.id)).toEqual([earlier.id, later.id, undated.id]);
  });

  it('orders same-date tasks high, medium, low', () => {
    const low = makeTask({ dueDate: '2026-11-05', priority: 'low' });
    const high = makeTask({ dueDate: '2026-11-05', priority: 'high' });
    const medium = makeTask({ dueDate: '2026-11-05', priority: 'medium' });
    expect(sortBasic([low, medium, high]).map((task) => task.priority)).toEqual([
      'high',
      'medium',
      'low',
    ]);
  });

  it('orders same-date and same-priority tasks newest first, then by id', () => {
    const older = makeTask({
      dueDate: '2026-11-05',
      createdAt: '2026-11-01T00:00:00.000Z',
      id: 'b-task',
    });
    const newer = makeTask({
      dueDate: '2026-11-05',
      createdAt: '2026-11-02T00:00:00.000Z',
      id: 'c-task',
    });
    const sameTime = makeTask({
      dueDate: '2026-11-05',
      createdAt: '2026-11-02T00:00:00.000Z',
      id: 'a-task',
    });
    expect(sortBasic([older, newer, sameTime]).map((task) => task.id)).toEqual([
      'a-task',
      'c-task',
      'b-task',
    ]);
  });

  it('orders undated tasks by priority, then newest, then id', () => {
    const low = makeTask({ priority: 'low', createdAt: '2026-11-03T00:00:00.000Z' });
    const highOld = makeTask({ priority: 'high', createdAt: '2026-11-01T00:00:00.000Z' });
    const highNew = makeTask({ priority: 'high', createdAt: '2026-11-02T00:00:00.000Z' });
    expect(sortBasic([low, highOld, highNew]).map((task) => task.id)).toEqual([
      highNew.id,
      highOld.id,
      low.id,
    ]);
  });

  it('uses the unique id as the final stable tiebreak', () => {
    const base = {
      dueDate: '2026-11-05',
      priority: 'high' as const,
      createdAt: '2026-11-01T00:00:00.000Z',
    };
    const b = makeTask({ ...base, id: 'b' });
    const a = makeTask({ ...base, id: 'a' });
    expect([b, a].sort(compareBasic).map((task) => task.id)).toEqual(['a', 'b']);
  });
});

describe('completed ordering', () => {
  it('orders by completion time descending, then creation time descending', () => {
    const firstDone = makeTask({
      status: 'completed',
      completedAt: '2026-11-04T10:00:00.000Z',
      createdAt: '2026-11-01T00:00:00.000Z',
    });
    const laterDone = makeTask({
      status: 'completed',
      completedAt: '2026-11-05T10:00:00.000Z',
      createdAt: '2026-11-01T00:00:00.000Z',
    });
    const sameTimeNewer = makeTask({
      status: 'completed',
      completedAt: '2026-11-05T10:00:00.000Z',
      createdAt: '2026-11-03T00:00:00.000Z',
    });
    expect(sortCompleted([firstDone, laterDone, sameTimeNewer]).map((task) => task.id)).toEqual([
      sameTimeNewer.id,
      laterDone.id,
      firstDone.id,
    ]);
  });
});
