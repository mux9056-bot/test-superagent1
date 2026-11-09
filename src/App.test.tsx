import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './storage/storage';
import { THEME_STORAGE_KEY } from './theme';

const user = userEvent.setup();

async function renderApp() {
  const view = render(<App />);
  await screen.findByRole('banner');
  return view;
}

async function openCreate() {
  const toolbar = screen.getByRole('banner');
  await user.click(within(toolbar).getByRole('button', { name: /新增任务/ }));
  return screen.findByRole('dialog', { name: '新增任务' });
}

async function createTask(title: string) {
  const dialog = await openCreate();
  await user.type(within(dialog).getByLabelText('标题'), title);
  await user.click(within(dialog).getByRole('button', { name: '保存' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('task flows', () => {
  it('creates a task, persists it, and restores it after reopening', async () => {
    const { unmount } = await renderApp();
    expect(screen.getByText('从第一件小事开始')).toBeInTheDocument();

    await createTask('  写周报  ');
    expect(screen.getByText('写周报')).toBeInTheDocument();
    expect(screen.getByText('写周报').closest('li')).toHaveTextContent('中优先级');

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string);
    expect(saved.tasks).toHaveLength(1);
    expect(saved.tasks[0]).toMatchObject({
      title: '写周报',
      status: 'open',
      priority: 'medium',
      listId: 'inbox',
    });

    unmount();
    await renderApp();
    expect(await screen.findByText('写周报')).toBeInTheDocument();
  });

  it('creates only one task when save is triggered repeatedly', async () => {
    await renderApp();
    const dialog = await openCreate();
    await user.type(within(dialog).getByLabelText('标题'), '只创建一次');
    const save = within(dialog).getByRole('button', { name: '保存' });

    // Two clicks in the same batch, before React can disable the button.
    fireEvent.click(save);
    fireEvent.click(save);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string);
    expect(saved.tasks).toHaveLength(1);
    expect(saved.tasks[0].title).toBe('只创建一次');
  });

  it('blocks blank titles and keeps the entered content', async () => {
    await renderApp();
    const dialog = await openCreate();
    const title = within(dialog).getByLabelText('标题');
    await user.type(title, '   ');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));

    expect(within(dialog).getByText('请输入任务标题')).toBeInTheDocument();
    expect(title).toHaveValue('   ');
    expect(screen.queryByText('写周报')).not.toBeInTheDocument();
  });

  it('completes and reopens a task, moving it between views', async () => {
    await renderApp();
    await createTask('完成我');
    const taskRow = screen.getByText('完成我').closest('li') as HTMLElement;

    await user.click(within(taskRow).getByRole('button', { name: '完成任务「完成我」' }));
    expect(screen.queryByText('完成我')).not.toBeInTheDocument();

    const nav = screen.getByRole('complementary', { name: '任务导航' });
    await user.click(within(nav).getByRole('button', { name: /^已完成/ }));
    const completedRow = screen.getByText('完成我').closest('li') as HTMLElement;
    await user.click(
      within(completedRow).getByRole('button', { name: '重新打开任务「完成我」' }),
    );
    expect(screen.getByText('还没有已完成的任务')).toBeInTheDocument();

    await user.click(within(nav).getByRole('button', { name: /^今日/ }));
    expect(screen.getByText('完成我')).toBeInTheDocument();
  });

  it('shows a discard prompt for unsaved edits and keeps input when continuing', async () => {
    await renderApp();
    await createTask('原任务');
    await user.click(screen.getByRole('button', { name: '原任务' }));

    const dialog = await screen.findByRole('dialog', { name: '编辑任务' });
    const title = within(dialog).getByLabelText('标题');
    await user.clear(title);
    await user.type(title, '修改后的标题');
    await user.keyboard('{Escape}');

    const discard = await screen.findByRole('dialog', { name: '放弃修改？' });
    await user.click(within(discard).getByRole('button', { name: '继续编辑' }));
    expect(title).toHaveValue('修改后的标题');

    await user.keyboard('{Escape}');
    const discardAgain = await screen.findByRole('dialog', { name: '放弃修改？' });
    await user.click(within(discardAgain).getByRole('button', { name: '放弃修改' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('原任务')).toBeInTheDocument();
  });

  it('moves focus into the dialog and restores it to the trigger on close', async () => {
    await renderApp();
    await createTask('焦点任务');
    const trigger = screen.getByRole('button', { name: '焦点任务' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: '编辑任务' });
    expect(within(dialog).getByLabelText('标题')).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: '取消' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('does not submit on Enter while an IME composition is active', async () => {
    await renderApp();
    const dialog = await openCreate();
    const title = within(dialog).getByLabelText('标题');
    await user.type(title, '测试输入');

    fireEvent.compositionStart(title);
    fireEvent.keyDown(title, { key: 'Enter', isComposing: true });
    expect(screen.queryByText('测试输入')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '新增任务' })).toBeInTheDocument();

    fireEvent.compositionEnd(title);
    await user.click(within(dialog).getByRole('button', { name: '保存' }));
    await waitFor(() => expect(screen.getByText('测试输入')).toBeInTheDocument());
  });
});

describe('lists', () => {
  it('creates a list, adds a task to it, then deletes the list and moves tasks to Inbox', async () => {
    await renderApp();
    const nav = screen.getByRole('complementary', { name: '任务导航' });

    await user.click(within(nav).getByRole('button', { name: '新建清单' }));
    const createDialog = await screen.findByRole('dialog', { name: '新建清单' });
    await user.type(within(createDialog).getByLabelText('清单名称'), '工作');
    await user.click(within(createDialog).getByRole('button', { name: '创建' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await user.click(within(nav).getByRole('button', { name: /^工作/ }));
    expect(screen.getByText('这个清单还没有任务')).toBeInTheDocument();

    await createTask('工作事项');
    expect(screen.getByText('工作事项')).toBeInTheDocument();

    await user.click(within(nav).getByRole('button', { name: '「工作」清单操作' }));
    await user.click(screen.getByRole('menuitem', { name: '删除清单' }));

    const confirm = await screen.findByRole('dialog', { name: '删除清单' });
    expect(within(confirm).getByText(/任务将移至收集箱/)).toBeInTheDocument();
    expect(within(confirm).getByText(/共有 1 个任务/)).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: '删除清单' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(nav).queryByRole('button', { name: /^工作/ })).not.toBeInTheDocument();

    await user.click(within(nav).getByRole('button', { name: /^收集箱/ }));
    expect(screen.getByText('工作事项')).toBeInTheDocument();
  });

  it('rejects duplicate list names, ignoring English case', async () => {
    await renderApp();
    const nav = screen.getByRole('complementary', { name: '任务导航' });

    for (const name of ['Work', 'WORK']) {
      await user.click(within(nav).getByRole('button', { name: '新建清单' }));
      const dialog = await screen.findByRole('dialog', { name: '新建清单' });
      await user.type(within(dialog).getByLabelText('清单名称'), name);
      await user.click(within(dialog).getByRole('button', { name: '创建' }));
      if (name === 'Work') {
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      } else {
        expect(within(dialog).getByText('已存在同名清单')).toBeInTheDocument();
        await user.click(within(dialog).getByRole('button', { name: '取消' }));
      }
    }
  });
});

describe('persistence failures and corruption', () => {
  it('keeps the form open and reports failure when saving cannot be persisted', async () => {
    await renderApp();
    const dialog = await openCreate();
    const title = within(dialog).getByLabelText('标题');
    await user.type(title, '无法保存的任务');

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    await user.click(within(dialog).getByRole('button', { name: '保存' }));

    expect(within(dialog).getByText('保存失败，请重试')).toBeInTheDocument();
    expect(title).toHaveValue('无法保存的任务');
    expect(screen.queryByText('无法保存的任务', { selector: '.task-title' })).not.toBeInTheDocument();

    setItemSpy.mockRestore();
    await user.click(within(dialog).getByRole('button', { name: '保存' }));
    await waitFor(() => expect(screen.getByText('无法保存的任务')).toBeInTheDocument());
  });

  it('refuses to read corrupt data and requires two confirmations before resetting', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{broken');
    render(<App />);

    expect(await screen.findByText('本地数据无法读取')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{broken');

    await user.click(screen.getByRole('button', { name: '重置数据' }));
    const first = await screen.findByRole('dialog', { name: '重置本地数据？' });
    await user.click(within(first).getByRole('button', { name: '继续' }));

    const second = await screen.findByRole('dialog', { name: '再次确认重置' });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{broken');
    await user.click(within(second).getByRole('button', { name: '确认重置' }));

    expect(await screen.findByText('从第一件小事开始')).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string);
    expect(saved.tasks).toEqual([]);
    expect(saved.lists).toHaveLength(1);
    expect(saved.lists[0].name).toBe('收集箱');
  });
});

describe('theme modes', () => {
  it('shows four theme options and defaults to the light theme', async () => {
    await renderApp();
    const nav = screen.getByRole('complementary', { name: '任务导航' });
    const options = within(nav).getAllByRole('radio');

    expect(options.map((option) => option.getAttribute('value'))).toEqual([
      'light',
      'dark',
      'warm',
      'contrast',
    ]);
    expect(within(nav).getByRole('radio', { name: '浅色' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('applies a selected theme and restores it after remounting', async () => {
    const { unmount } = await renderApp();
    const nav = screen.getByRole('complementary', { name: '任务导航' });

    await user.click(within(nav).getByRole('radio', { name: '深色' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(within(nav).getByRole('radio', { name: '深色' })).toBeChecked();

    unmount();
    await renderApp();
    const restoredNav = screen.getByRole('complementary', { name: '任务导航' });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(within(restoredNav).getByRole('radio', { name: '深色' })).toBeChecked();
  });
});
