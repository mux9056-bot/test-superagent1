import { expect, test } from '@playwright/test';
import { buildData, dateKey, seed, STORAGE_KEY } from './helpers';

test('capture desktop and mobile product states', async ({ page }) => {
  await seed(
    page,
    buildData({
      lists: [
        { id: 'work', name: '工作' },
        { id: 'life', name: '生活' },
      ],
      tasks: [
        {
          title: '完成产品需求评审',
          dueDate: dateKey(-1),
          priority: 'high',
          listId: 'work',
        },
        {
          title: '整理本周会议纪要',
          dueDate: dateKey(0),
          priority: 'medium',
          listId: 'work',
        },
        {
          title: '给团队发送进度同步',
          dueDate: dateKey(0),
          priority: 'high',
          description: '包含本周风险与下一步计划',
          listId: 'inbox',
        },
        { title: '预约牙医复诊', dueDate: dateKey(2), priority: 'low', listId: 'life' },
        {
          title: '阅读《高效能人士的七个习惯》第三章',
          dueDate: dateKey(5),
          priority: 'medium',
          listId: 'life',
        },
        { title: '更新个人简历与作品集', priority: 'low', listId: 'inbox' },
        {
          title: '整理季度照片',
          status: 'completed',
          completedAt: '2026-01-05T09:00:00.000Z',
          dueDate: dateKey(-3),
          listId: 'life',
        },
      ],
    }),
  );
  await page.goto('/');
  await expect(page.getByText('整理本周会议纪要')).toBeVisible();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'docs/screenshots/after-desktop-today.png' });

  await page.getByRole('button', { name: '完成产品需求评审', exact: true }).click();
  const detail = page.getByRole('dialog', { name: '编辑任务' });
  await expect(detail).toBeVisible();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'docs/screenshots/after-desktop-detail.png' });
  await detail.getByRole('button', { name: '取消' }).click();

  await page.getByRole('button', { name: '「工作」清单操作' }).click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'docs/screenshots/after-desktop-list-menu.png' });
  await page.keyboard.press('Escape');

  const mobile = await page.context().newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto('/');
  await expect(mobile.getByText('整理本周会议纪要')).toBeVisible();
  await mobile.waitForTimeout(250);
  await mobile.screenshot({ path: 'docs/screenshots/after-mobile-today.png' });

  await mobile.getByRole('button', { name: '打开导航菜单' }).click();
  await expect(mobile.getByRole('complementary', { name: '任务导航' })).toBeVisible();
  await mobile.waitForTimeout(350);
  await mobile.screenshot({ path: 'docs/screenshots/after-mobile-nav.png' });
  await mobile.getByRole('button', { name: '关闭导航' }).click();

  await mobile.getByRole('button', { name: '完成产品需求评审', exact: true }).click();
  await expect(mobile.getByRole('dialog', { name: '编辑任务' })).toBeVisible();
  await mobile.waitForTimeout(250);
  await mobile.screenshot({ path: 'docs/screenshots/after-mobile-detail.png' });
  await mobile.close();

  const errorPage = await page.context().newPage();
  await errorPage.goto('/');
  await errorPage.evaluate((key) => window.localStorage.setItem(key, '{broken-json'), STORAGE_KEY);
  await errorPage.reload();
  await expect(errorPage.getByRole('heading', { name: '本地数据无法读取' })).toBeVisible();
  await errorPage.screenshot({ path: 'docs/screenshots/after-corrupt-data.png' });
  await errorPage.close();
});
