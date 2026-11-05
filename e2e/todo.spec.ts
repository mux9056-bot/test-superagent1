import { expect, test } from '@playwright/test';
import {
  buildData,
  createTaskViaUi,
  dateKey,
  nav,
  seed,
  STORAGE_KEY,
} from './helpers';

test.describe('core task flow', () => {
  test('create, persist, complete, reopen, edit and delete', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByText('从第一件小事开始')).toBeVisible();

    await createTaskViaUi(page, '写周报');
    await expect(page.getByText('写周报')).toBeVisible();
    await expect(page.locator('.view-count')).toHaveText('1 个任务');

    await page.reload();
    await expect(page.getByText('写周报')).toBeVisible();

    await page.getByRole('button', { name: '完成任务「写周报」' }).click();
    await expect(page.getByText('写周报')).toBeHidden();
    await expect(nav(page).getByRole('button', { name: /^已完成/ })).toContainText('1');

    await nav(page).getByRole('button', { name: /^已完成/ }).click();
    await expect(page.getByText('写周报')).toBeVisible();
    await page.getByRole('button', { name: '重新打开任务「写周报」' }).click();
    await expect(page.getByText('还没有已完成的任务')).toBeVisible();

    await nav(page).getByRole('button', { name: /^今日/ }).click();
    await expect(page.getByText('写周报')).toBeVisible();

    await page.getByRole('button', { name: '写周报', exact: true }).click();
    const edit = page.getByRole('dialog', { name: '编辑任务' });
    await edit.getByLabel('标题').fill('写月报');
    await edit.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.getByText('写月报')).toBeVisible();

    await page.reload();
    await expect(page.getByText('写月报')).toBeVisible();

    await page.getByRole('button', { name: '写月报', exact: true }).click();
    const editAgain = page.getByRole('dialog', { name: '编辑任务' });
    await editAgain.getByRole('button', { name: '删除任务' }).click();
    const confirm = page.getByRole('dialog', { name: '删除任务' });
    await expect(confirm.getByText('删除后无法恢复，确定删除吗？')).toBeVisible();
    await confirm.getByRole('button', { name: '取消' }).click();
    await expect(confirm).toBeHidden();
    await expect(editAgain).toBeVisible();

    await editAgain.getByRole('button', { name: '删除任务' }).click();
    const confirmAgain = page.getByRole('dialog', { name: '删除任务' });
    await expect(confirmAgain).toBeVisible();
    await confirmAgain.getByRole('button', { name: '删除', exact: true }).click();
    await expect(page.getByText('写月报')).toBeHidden();
    await expect(page.getByText('今天没有待办事项')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('submits on Enter in the title and keeps newlines in notes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('banner').getByRole('button', { name: /新增任务/ }).click();
    const create = page.getByRole('dialog', { name: '新增任务' });
    await create.getByLabel('标题').fill('键盘任务');
    await create.getByLabel('标题').press('Enter');
    await expect(page.getByText('键盘任务')).toBeVisible();

    await page.getByRole('button', { name: '键盘任务', exact: true }).click();
    const edit = page.getByRole('dialog', { name: '编辑任务' });
    const notes = edit.getByLabel('备注');
    await notes.fill('第一行');
    await notes.press('Enter');
    await notes.type('第二行');
    await edit.getByRole('button', { name: '保存', exact: true }).click();
    await expect(edit).toBeHidden();

    await page.getByRole('button', { name: '键盘任务', exact: true }).click();
    const reopened = page.getByRole('dialog', { name: '编辑任务' });
    await expect(reopened.getByLabel('备注')).toHaveValue('第一行\n第二行');
  });
});

test.describe('views and sorting', () => {
  test('today, next 7 days, all and completed follow the date rules and counts', async ({
    page,
  }) => {
    await seed(
      page,
      buildData({
        tasks: [
          { title: '昨天任务', dueDate: dateKey(-1) },
          { title: '今天任务', dueDate: dateKey(0) },
          { title: '明天任务', dueDate: dateKey(1) },
          { title: '第7天任务', dueDate: dateKey(7) },
          { title: '第8天任务', dueDate: dateKey(8) },
          { title: '无日期任务' },
          {
            title: '已完成任务',
            dueDate: dateKey(0),
            status: 'completed',
            completedAt: '2026-01-05T00:00:00.000Z',
          },
        ],
      }),
    );
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /^已逾期/ })).toContainText('1');
    await expect(page.getByRole('heading', { name: /^今天/ })).toContainText('1');
    await expect(page.getByText('昨天任务')).toBeVisible();
    await expect(page.getByText('今天任务')).toBeVisible();
    await expect(page.getByText('明天任务')).toBeHidden();
    await expect(page.getByText('无日期任务')).toBeHidden();
    await expect(page.getByText('已完成任务')).toBeHidden();

    await expect(nav(page).getByRole('button', { name: /^今日/ })).toContainText('2');
    await expect(nav(page).getByRole('button', { name: /^未来 7 天/ })).toContainText('2');
    await expect(nav(page).getByRole('button', { name: /^全部待办/ })).toContainText('6');
    await expect(nav(page).getByRole('button', { name: /^已完成/ })).toContainText('1');

    await nav(page).getByRole('button', { name: /^未来 7 天/ }).click();
    await expect(page.getByText('明天任务')).toBeVisible();
    await expect(page.getByText('第7天任务')).toBeVisible();
    await expect(page.getByText('第8天任务')).toBeHidden();
    await expect(page.getByText('昨天任务')).toBeHidden();
    await expect(page.getByRole('heading', { name: /^明天/ })).toBeVisible();

    await nav(page).getByRole('button', { name: /^全部待办/ }).click();
    await expect(page.locator('.task-row')).toHaveCount(6);
    await expect(page.getByText('已完成任务')).toBeHidden();
    await expect(page.getByText('无日期任务')).toBeVisible();

    await nav(page).getByRole('button', { name: /^已完成/ }).click();
    await expect(page.locator('.task-row')).toHaveCount(1);
    await expect(page.getByText('已完成任务')).toBeVisible();
  });

  test('sorts dated tasks by date, then priority, and undated tasks last', async ({ page }) => {
    await seed(
      page,
      buildData({
        tasks: [
          { title: '无日期低', priority: 'low' },
          { title: '远期高', priority: 'high', dueDate: dateKey(3) },
          { title: '今天低', priority: 'low', dueDate: dateKey(0) },
          { title: '今天高', priority: 'high', dueDate: dateKey(0) },
        ],
      }),
    );
    await page.goto('/');
    await nav(page).getByRole('button', { name: /^全部待办/ }).click();
    const titles = page.locator('.task-title');
    await expect(titles).toHaveText(['今天高', '今天低', '远期高', '无日期低']);
  });
});

test.describe('search and filters', () => {
  test('searches within the current view, intersects priority, and resets on view switch', async ({
    page,
  }) => {
    await seed(
      page,
      buildData({
        tasks: [
          { title: '写周报', description: '包含 OKR 内容', priority: 'high', dueDate: dateKey(0) },
          { title: '买牛奶', description: '', priority: 'low', dueDate: dateKey(0) },
          {
            title: '<b>报价</b> 与 😀',
            description: 'HTML 片段',
            priority: 'medium',
            dueDate: dateKey(0),
          },
        ],
      }),
    );
    await page.goto('/');

    const search = page.getByLabel('搜索当前视图');
    await expect(page.locator('.view-count')).toHaveText('3 个任务');

    await search.fill(' okr ');
    await expect(page.locator('.task-row')).toHaveCount(1);
    await expect(page.getByText('写周报')).toBeVisible();
    await expect(page.locator('.view-count')).toHaveText('1 个任务');
    await expect(nav(page).getByRole('button', { name: /^今日/ })).toContainText('3');

    await search.fill('');
    await page.getByLabel('优先级筛选').selectOption('high');
    await expect(page.locator('.task-row')).toHaveCount(1);
    await expect(page.getByText('写周报')).toBeVisible();

    await search.fill('买');
    await expect(page.getByText('没有符合条件的任务')).toBeVisible();
    await page.getByRole('button', { name: '清空搜索与筛选' }).click();
    await expect(page.getByLabel('搜索当前视图')).toHaveValue('');
    await expect(page.getByLabel('优先级筛选')).toHaveValue('all');
    await expect(page.locator('.task-row')).toHaveCount(3);

    await search.fill('b');
    await expect(page.getByText('<b>报价</b> 与 😀', { exact: true })).toBeVisible();
    await expect(page.locator('.task-title b')).toHaveCount(0);

    await search.fill('okr');
    await nav(page).getByRole('button', { name: /^全部待办/ }).click();
    await expect(page.getByLabel('搜索当前视图')).toHaveValue('');
    await expect(page.getByLabel('优先级筛选')).toHaveValue('all');
    await expect(page.locator('.task-row')).toHaveCount(3);
  });
});

test.describe('lists', () => {
  test('renames and deletes a list, moving all tasks to Inbox', async ({ page }) => {
    await seed(
      page,
      buildData({
        lists: [
          { id: 'work', name: '工作' },
          { id: 'life', name: '生活' },
        ],
        tasks: [
          { title: '项目 A', listId: 'work' },
          {
            title: '项目 B',
            listId: 'work',
            status: 'completed',
            completedAt: '2026-01-05T00:00:00.000Z',
          },
          { title: '买菜', listId: 'life' },
        ],
      }),
    );
    await page.goto('/');
    await nav(page).getByRole('button', { name: /^工作/ }).click();
    await expect(page.getByRole('heading', { name: '工作' })).toBeVisible();
    await expect(page.locator('.task-row')).toHaveCount(1);

    await nav(page).getByRole('button', { name: '「工作」清单操作' }).click();
    await page.getByRole('menuitem', { name: '重命名' }).click();
    const rename = page.getByRole('dialog', { name: '重命名清单' });
    await rename.getByLabel('清单名称').fill('项目');
    await rename.getByRole('button', { name: '保存', exact: true }).click();
    await expect(rename).toBeHidden();
    await expect(nav(page).getByRole('button', { name: /^项目/ })).toBeVisible();
    await expect(page.getByText('项目 A')).toBeVisible();

    await nav(page).getByRole('button', { name: '「项目」清单操作' }).click();
    await page.getByRole('menuitem', { name: '删除清单' }).click();
    const confirm = page.getByRole('dialog', { name: '删除清单' });
    await expect(confirm.getByText('清单内的全部任务将移至收集箱，任务会保留。')).toBeVisible();
    await expect(confirm.getByText(/共有 2 个任务/)).toBeVisible();
    await confirm.getByRole('button', { name: '删除清单' }).click();
    await expect(confirm).toBeHidden();

    await expect(nav(page).getByRole('button', { name: /^项目/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '收集箱' })).toBeVisible();
    await expect(page.getByText('项目 A')).toBeVisible();
    await page.getByRole('tab', { name: /已完成/ }).click();
    await expect(page.getByText('项目 B')).toBeVisible();
    await expect(nav(page).getByRole('button', { name: '「收集箱」清单操作' })).toHaveCount(0);
  });

  test('rejects duplicate list names ignoring English case and protects Inbox', async ({
    page,
  }) => {
    await seed(
      page,
      buildData({ lists: [{ id: 'work', name: 'Work' }], tasks: [] }),
    );
    await page.goto('/');

    await nav(page).getByRole('button', { name: '新建清单' }).click();
    const dialog = page.getByRole('dialog', { name: '新建清单' });
    await dialog.getByLabel('清单名称').fill('WORK');
    await dialog.getByRole('button', { name: '创建' }).click();
    await expect(dialog.getByText('已存在同名清单')).toBeVisible();
    await dialog.getByRole('button', { name: '取消' }).click();

    await expect(nav(page).getByRole('button', { name: /^Work/ })).toBeVisible();
    await expect(nav(page).getByRole('button', { name: '「收集箱」清单操作' })).toHaveCount(0);
  });
});

test.describe('persistence failures', () => {
  test('does not show success and keeps input when writes fail', async ({ page }) => {
    await page.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function setItem(key: string, value: string) {
        if ((window as unknown as { __failWrites?: boolean }).__failWrites) {
          throw new DOMException('quota', 'QuotaExceededError');
        }
        return original.call(this, key, value);
      };
    });
    await page.goto('/');
    await page.getByRole('banner').getByRole('button', { name: /新增任务/ }).click();
    const dialog = page.getByRole('dialog', { name: '新增任务' });
    await dialog.getByLabel('标题').fill('无法保存的任务');

    await page.evaluate(() => {
      (window as unknown as { __failWrites?: boolean }).__failWrites = true;
    });
    await dialog.getByRole('button', { name: '保存', exact: true }).click();
    await expect(dialog.getByText('保存失败，请重试')).toBeVisible();
    await expect(dialog.getByLabel('标题')).toHaveValue('无法保存的任务');
    await expect(page.locator('.task-row')).toHaveCount(0);

    await page.evaluate(() => {
      (window as unknown as { __failWrites?: boolean }).__failWrites = false;
    });
    await dialog.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.getByText('无法保存的任务')).toBeVisible();
  });

  test('keeps edit input and the task when edit or delete cannot be saved', async ({ page }) => {
    await page.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function setItem(key: string, value: string) {
        if ((window as unknown as { __failWrites?: boolean }).__failWrites) {
          throw new DOMException('quota', 'QuotaExceededError');
        }
        return original.call(this, key, value);
      };
    });
    await seed(page, buildData({ tasks: [{ title: '原任务' }] }));
    await page.goto('/');
    await nav(page).getByRole('button', { name: /^全部待办/ }).click();
    await page.getByRole('button', { name: '原任务', exact: true }).click();
    const edit = page.getByRole('dialog', { name: '编辑任务' });

    await edit.getByLabel('标题').fill('修改后');
    await page.evaluate(() => {
      (window as unknown as { __failWrites?: boolean }).__failWrites = true;
    });
    await edit.getByRole('button', { name: '保存', exact: true }).click();
    await expect(edit.getByText('保存失败，请重试')).toBeVisible();
    await expect(edit.getByLabel('标题')).toHaveValue('修改后');
    expect(
      await page.evaluate(
        (key) => JSON.parse(window.localStorage.getItem(key) as string).tasks[0].title,
        STORAGE_KEY,
      ),
    ).toBe('原任务');

    await edit.getByRole('button', { name: '删除任务' }).click();
    const confirm = page.getByRole('dialog', { name: '删除任务' });
    await confirm.getByRole('button', { name: '删除', exact: true }).click();
    await expect(confirm.getByText('保存失败，请重试')).toBeVisible();
    expect(
      await page.evaluate(
        (key) => JSON.parse(window.localStorage.getItem(key) as string).tasks.length,
        STORAGE_KEY,
      ),
    ).toBe(1);

    await page.evaluate(() => {
      (window as unknown as { __failWrites?: boolean }).__failWrites = false;
    });
    await confirm.getByRole('button', { name: '删除', exact: true }).click();
    await expect(confirm).toBeHidden();
    await expect(page.locator('.task-row')).toHaveCount(0);
  });

  test('keeps the original state when a completion toggle cannot be saved', async ({ page }) => {
    await seed(page, buildData({ tasks: [{ title: '切换任务' }] }));
    await page.goto('/');
    await nav(page).getByRole('button', { name: /^全部待办/ }).click();

    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('quota', 'QuotaExceededError');
      };
    });
    await page.getByRole('button', { name: '完成任务「切换任务」' }).click();
    await expect(page.locator('.storage-banner')).toContainText('保存失败，请重试');
    await expect(page.locator('.toast-error')).toContainText('保存失败，请重试');
    await expect(page.locator('.task-row')).toHaveCount(1);
    await expect(page.getByRole('button', { name: '完成任务「切换任务」' })).toBeVisible();
  });
});

test.describe('multi-tab conflicts', () => {
  test('does not silently overwrite another tab and offers a reload', async ({ page }) => {
    await page.goto('/');
    await createTaskViaUi(page, '共享任务');
    await expect(page.getByText('共享任务')).toBeVisible();

    const second = await page.context().newPage();
    await second.goto('/');
    await expect(second.getByText('共享任务')).toBeVisible();

    await page.getByRole('button', { name: '共享任务', exact: true }).click();
    await second.getByRole('button', { name: '共享任务', exact: true }).click();
    const dialogA = page.getByRole('dialog', { name: '编辑任务' });
    const dialogB = second.getByRole('dialog', { name: '编辑任务' });

    await dialogA.getByLabel('标题').fill('A 版本');
    await dialogA.getByRole('button', { name: '保存', exact: true }).click();
    await expect(page.getByText('A 版本')).toBeVisible();

    await expect(dialogB.getByText(/其他页面已更新此任务/)).toBeVisible();
    await dialogB.getByLabel('标题').fill('B 版本');
    await dialogB.getByRole('button', { name: '保存', exact: true }).click();
    await expect(dialogB.getByText(/已在其他页面被修改/)).toBeVisible();
    await expect(dialogB.getByLabel('标题')).toHaveValue('B 版本');

    const storedTitle = await second.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key) as string).tasks[0].title,
      STORAGE_KEY,
    );
    expect(storedTitle).toBe('A 版本');

    await dialogB.getByRole('button', { name: '载入最新记录' }).click();
    await expect(dialogB.getByLabel('标题')).toHaveValue('A 版本');
    await second.close();
  });

  test('detects a list deleted in another tab and reloads without invalid references', async ({
    page,
  }) => {
    await seed(
      page,
      buildData({
        lists: [{ id: 'work', name: '工作' }],
        tasks: [{ title: '清单任务', listId: 'work' }],
      }),
    );
    await page.goto('/');
    const second = await page.context().newPage();
    await second.goto('/');
    await second.getByRole('navigation').getByRole('button', { name: /^全部待办/ }).click();
    await second.getByRole('button', { name: '清单任务', exact: true }).click();
    const dialogB = second.getByRole('dialog', { name: '编辑任务' });
    await expect(dialogB).toBeVisible();

    await nav(page).getByRole('button', { name: '「工作」清单操作' }).click();
    await page.getByRole('menuitem', { name: '删除清单' }).click();
    await page
      .getByRole('dialog', { name: '删除清单' })
      .getByRole('button', { name: '删除清单' })
      .click();
    await expect(page.getByRole('dialog', { name: '删除清单' })).toBeHidden();

    await dialogB.getByLabel('标题').fill('修改后');
    await dialogB.getByRole('button', { name: '保存', exact: true }).click();
    await expect(dialogB.getByText(/任务所属清单已被删除/)).toBeVisible();

    await dialogB.getByRole('button', { name: '载入最新记录' }).click();
    await expect(dialogB.getByLabel('所属清单')).toHaveValue('inbox');
    const stored = await second.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key) as string),
      STORAGE_KEY,
    );
    expect(stored.lists.some((list: { id: string }) => list.id === 'work')).toBe(false);
    expect(stored.tasks[0].listId).toBe('inbox');
    await second.close();
  });

  test('does not resurrect a task deleted in another tab', async ({ page }) => {
    await page.goto('/');
    await createTaskViaUi(page, '将被删除');
    const second = await page.context().newPage();
    await second.goto('/');
    await expect(second.getByText('将被删除')).toBeVisible();

    await page.getByRole('button', { name: '将被删除', exact: true }).click();
    await second.getByRole('button', { name: '将被删除', exact: true }).click();
    const dialogA = page.getByRole('dialog', { name: '编辑任务' });
    const dialogB = second.getByRole('dialog', { name: '编辑任务' });
    await expect(dialogB).toBeVisible();

    await dialogA.getByRole('button', { name: '删除任务' }).click();
    await page
      .getByRole('dialog', { name: '删除任务' })
      .getByRole('button', { name: '删除', exact: true })
      .click();
    await expect(dialogA).toBeHidden();

    await expect(dialogB.getByText(/已在其他页面被删除/)).toBeVisible();
    await dialogB.getByLabel('标题').fill('尝试恢复');
    await dialogB.getByRole('button', { name: '保存', exact: true }).click();
    await expect(dialogB.getByText(/已在其他页面被删除/)).toBeVisible();

    const count = await second.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key) as string).tasks.length,
      STORAGE_KEY,
    );
    expect(count).toBe(0);

    await dialogB.getByRole('button', { name: '载入最新记录' }).click();
    await expect(dialogB).toBeHidden();
    await expect(page.getByText('今天没有待办事项')).toBeVisible();
    await second.close();
  });
});

test.describe('corrupt data', () => {
  test('preserves corrupt data and requires two confirmations to reset', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, '{broken-json');
    }, STORAGE_KEY);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: '本地数据无法读取' })).toBeVisible();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe(
      '{broken-json',
    );

    await page.getByRole('button', { name: '重置数据' }).click();
    const first = page.getByRole('dialog', { name: '重置本地数据？' });
    await expect(first).toBeVisible();
    await first.getByRole('button', { name: '继续' }).click();

    const second = page.getByRole('dialog', { name: '再次确认重置' });
    await expect(second).toBeVisible();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBe(
      '{broken-json',
    );
    await second.getByRole('button', { name: '确认重置' }).click();

    await expect(page.getByText('从第一件小事开始')).toBeVisible();
    const stored = await page.evaluate(
      (key) => JSON.parse(window.localStorage.getItem(key) as string),
      STORAGE_KEY,
    );
    expect(stored.tasks).toEqual([]);
    expect(stored.lists).toHaveLength(1);
    expect(stored.lists[0].name).toBe('收集箱');
  });
});

test.describe('responsive layout', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('has no horizontal overflow and keeps controls reachable at 360px', async ({ page }) => {
    await seed(
      page,
      buildData({
        tasks: [
          {
            title: 'https://example.com/' + 'a'.repeat(140),
            dueDate: dateKey(0),
            priority: 'high',
          },
          { title: '普通任务', dueDate: dateKey(0) },
        ],
      }),
    );
    await page.goto('/');
    await expect(page.getByText('普通任务')).toBeVisible();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);

    const completeBox = await page
      .getByRole('button', { name: /完成任务/ })
      .first()
      .boundingBox();
    expect(completeBox?.width).toBeGreaterThanOrEqual(44);
    expect(completeBox?.height).toBeGreaterThanOrEqual(44);

    await expect(nav(page)).toBeHidden();
    await page.getByRole('button', { name: '打开导航菜单' }).click();
    await expect(nav(page)).toBeVisible();
    await nav(page).getByRole('button', { name: /^未来 7 天/ }).click();
    await expect(nav(page)).toBeHidden();
    await expect(page.getByText('未来 7 天暂无安排')).toBeVisible();

    await page.getByRole('banner').getByRole('button', { name: /新增/ }).click();
    const dialog = page.getByRole('dialog', { name: '新增任务' });
    const box = await dialog.boundingBox();
    expect(box?.width).toBeGreaterThan(340);
    await dialog.getByLabel('标题').fill('手机任务');
    await dialog.getByRole('button', { name: '保存', exact: true }).click();
    await expect(dialog).toBeHidden();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});

test('desktop 1440x900 keeps the sidebar layout and add entry reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(
    page,
    buildData({
      tasks: [{ title: '桌面任务', dueDate: dateKey(0), priority: 'medium' }],
    }),
  );
  await page.goto('/');
  await expect(page.getByText('桌面任务')).toBeVisible();
  await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeHidden();
  await expect(page.getByRole('complementary', { name: '任务导航' })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('button', { name: /新增任务/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test.describe('midnight rollover', () => {
  test('recomputes today and overdue groups without a manual refresh', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-05T23:59:00Z') });
    await seed(
      page,
      buildData({
        tasks: [
          { title: '今日任务', dueDate: '2026-11-05' },
          { title: '明日任务', dueDate: '2026-11-06' },
        ],
      }),
    );
    await page.goto('/');
    await expect(page.getByText('今日任务')).toBeVisible();
    await expect(page.getByText('明日任务')).toBeHidden();

    await page.clock.fastForward(2 * 60 * 1000);
    await expect(page.getByRole('heading', { name: /^已逾期/ })).toBeVisible();
    await expect(page.getByText('今日任务')).toBeVisible();
    await expect(page.getByText('明日任务')).toBeVisible();
  });
});

test.describe('performance baseline', () => {
  test('switches to a 1,000-task view within 300ms', async ({ page }) => {
    const lists = Array.from({ length: 20 }, (_, index) => ({
      id: `list-${index}`,
      name: `清单 ${index + 1}`,
    }));
    const tasks = Array.from({ length: 1000 }, (_, index) => ({
      title: `任务 ${index + 1}`,
      dueDate: dateKey((index % 15) - 7),
      listId: index % 10 === 0 ? 'list-0' : 'inbox',
      priority: (['high', 'medium', 'low'] as const)[index % 3],
    }));
    await seed(page, buildData({ tasks, lists }));
    await page.goto('/');
    await expect(page.locator('.view-count')).toBeVisible();

    const duration = await page.evaluate(async () => {
      const target = Array.from(document.querySelectorAll('button')).find((button) =>
        button.textContent?.trim().startsWith('全部待办'),
      );
      const start = performance.now();
      target?.click();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      return performance.now() - start;
    });
    test.info().annotations.push({ type: 'view-switch-ms', description: duration.toFixed(1) });
    console.log(`View switch with 1,000 tasks: ${duration.toFixed(1)}ms`);
    expect(duration).toBeLessThan(300);
    await expect(page.locator('.task-row')).toHaveCount(1000);
  });
});
