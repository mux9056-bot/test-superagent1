import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { INBOX_ID, type ListTab, type PriorityFilter, type Task, type TaskInput, type TodoList, type ViewKey } from './domain/types';
import {
  computeNavCounts,
  groupVisibleTasks,
  selectVisibleTasks,
  taskMatchesView,
  type ViewSelection,
} from './domain/selectors';
import { orderedLists } from './domain/lists';
import { useTodoStore, type ListResult, type SaveResult } from './state/useTodoStore';
import { useToday } from './hooks/useToday';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { TaskList } from './components/TaskList';
import { EmptyState } from './components/EmptyState';
import { TaskDetail } from './components/TaskDetail';
import { ListDialog } from './components/ListDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DataNotice } from './components/DataNotice';
import { Toast, type ToastState } from './components/Toast';
import {
  IssueScreen,
  LoadErrorScreen,
  LoadingScreen,
  StorageBanner,
} from './components/StatusScreens';

type DetailState =
  | { mode: 'create'; listId: string; dueDate: string | null; session: number }
  | { mode: 'edit'; taskId: string; session: number };

type ListDialogState =
  | { mode: 'create' }
  | { mode: 'rename'; list: TodoList };

const VIEW_TITLES: Record<Exclude<ViewKey, 'list'>, string> = {
  today: '今日',
  next7: '未来 7 天',
  all: '全部待办',
  completed: '已完成',
};

export default function App() {
  const store = useTodoStore();
  const today = useToday();
  const [theme, setTheme] = useTheme();
  const data = store.data;
  const tasks = data?.tasks ?? [];

  const [view, setView] = useState<ViewKey>('today');
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [tab, setTab] = useState<ListTab>('open');
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [listDialog, setListDialog] = useState<ListDialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TodoList | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [dataNoticeOpen, setDataNoticeOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastSeq = useRef(0);
  const sessionSeq = useRef(0);

  const showToast = useCallback((kind: 'success' | 'error', text: string) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, kind, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(
      () => setToast(null),
      toast.kind === 'error' ? 7000 : 4000,
    );
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const lists = useMemo(() => (data ? orderedLists(data.lists) : []), [data]);
  const listNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const list of lists) map[list.id] = list.name;
    return map;
  }, [lists]);

  const selection: ViewSelection = useMemo(
    () => ({ view, listId: view === 'list' ? activeListId : null, tab }),
    [view, activeListId, tab],
  );

  const counts = useMemo(() => computeNavCounts(tasks, today), [tasks, today]);
  const visibleTasks = useMemo(
    () => selectVisibleTasks(tasks, selection, today, search, priority),
    [tasks, selection, today, search, priority],
  );
  const groups = useMemo(
    () => groupVisibleTasks(visibleTasks, selection, today),
    [visibleTasks, selection, today],
  );

  const currentList =
    view === 'list' ? lists.find((list) => list.id === activeListId) ?? null : null;
  const viewTitle = view === 'list' ? currentList?.name ?? '收集箱' : VIEW_TITLES[view];
  const filtersActive = search.trim().length > 0 || priority !== 'all';
  const firstUse = view === 'today' && tasks.length === 0 && !filtersActive && store.firstRun;

  const clearFilters = useCallback(() => {
    setSearch('');
    setPriority('all');
  }, []);

  const selectPrimary = useCallback(
    (next: Exclude<ViewKey, 'list'>) => {
      setView(next);
      setActiveListId(null);
      setTab('open');
      clearFilters();
      setMobileNavOpen(false);
    },
    [clearFilters],
  );

  const selectList = useCallback(
    (listId: string) => {
      setView('list');
      setActiveListId(listId);
      setTab('open');
      clearFilters();
      setMobileNavOpen(false);
    },
    [clearFilters],
  );

  const selectTab = useCallback(
    (next: ListTab) => {
      setTab(next);
      clearFilters();
    },
    [clearFilters],
  );

  // If a viewed list disappears (for example from another tab), fall back to Inbox.
  useEffect(() => {
    if (!data) return;
    if (view !== 'list') return;
    if (activeListId && data.lists.some((list) => list.id === activeListId)) return;
    setActiveListId(INBOX_ID);
    setTab('open');
    clearFilters();
  }, [data, view, activeListId, clearFilters]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  const defaultListId =
    view === 'list' && activeListId && lists.some((list) => list.id === activeListId)
      ? activeListId
      : INBOX_ID;

  const openCreate = useCallback(() => {
    sessionSeq.current += 1;
    setDetail({
      mode: 'create',
      listId: defaultListId,
      dueDate: view === 'today' ? today : null,
      session: sessionSeq.current,
    });
  }, [defaultListId, view, today]);

  const openEdit = useCallback((task: Task) => {
    sessionSeq.current += 1;
    setDetail({ mode: 'edit', taskId: task.id, session: sessionSeq.current });
  }, []);

  const openDetailTask =
    detail?.mode === 'edit' ? data?.tasks.find((task) => task.id === detail.taskId) : undefined;

  const withPlacementNote = useCallback(
    (base: string, task: Task) =>
      taskMatchesView(task, selection, today)
        ? base
        : `${base}（该任务不在当前视图中）`,
    [selection, today],
  );

  const handleSave = useCallback(
    (input: TaskInput, expectedRevision?: number): SaveResult => {
      if (!detail) return { ok: false, message: '保存失败，请重试' };
      if (detail.mode === 'edit') {
        if (expectedRevision === undefined) return { ok: false, message: '保存失败，请重试' };
        const result = store.updateTask(detail.taskId, input, expectedRevision);
        if (result.ok && result.task) {
          const message = withPlacementNote(result.message ?? '任务已保存', result.task);
          showToast('success', message);
          return { ...result, message };
        }
        if (result.message && !result.fieldErrors && !result.conflict) {
          showToast('error', result.message);
        }
        return result;
      }

      const result = store.createTask(input);
      if (result.ok && result.task) {
        const message = withPlacementNote(result.message ?? '任务已保存', result.task);
        showToast('success', message);
        return { ...result, message };
      }
      if (result.message) showToast('error', result.message);
      return result;
    },
    [detail, showToast, store, withPlacementNote],
  );

  const handleDeleteTask = useCallback(
    (taskId: string): SaveResult => {
      const result = store.deleteTask(taskId);
      if (result.ok) {
        showToast('success', result.message ?? '任务已删除');
      } else {
        showToast('error', result.message ?? '保存失败，请重试');
      }
      return result;
    },
    [showToast, store],
  );

  const handleToggle = useCallback(
    (task: Task) => {
      const result = store.toggleTask(task.id);
      if (result.ok) {
        showToast('success', result.message ?? '已更新任务状态');
      } else {
        showToast('error', result.message ?? '保存失败，请重试');
      }
    },
    [showToast, store],
  );

  const handleReloadLatest = useCallback(() => {
    if (!detail) return;
    if (detail.mode === 'create') {
      setDetail(null);
      return;
    }
    const latest = store.data?.tasks.find((task) => task.id === detail.taskId);
    if (!latest) {
      setDetail(null);
      showToast('success', '任务已不存在，已载入最新数据');
      return;
    }
    sessionSeq.current += 1;
    setDetail({ mode: 'edit', taskId: detail.taskId, session: sessionSeq.current });
  }, [detail, showToast, store.data]);

  const submitList = useCallback(
    (name: string): ListResult => {
      if (!listDialog) return { ok: false, message: '保存失败，请重试' };
      const result =
        listDialog.mode === 'create'
          ? store.createList(name)
          : store.renameList(listDialog.list.id, name);
      if (result.ok) showToast('success', result.message ?? '已保存');
      return result;
    },
    [listDialog, showToast, store],
  );

  const confirmDeleteList = useCallback(() => {
    if (!deleteTarget) return;
    const result = store.deleteList(deleteTarget.id);
    if (result.ok) {
      showToast('success', result.message ?? '清单已删除');
      if (activeListId === deleteTarget.id) {
        setView('list');
        setActiveListId(INBOX_ID);
        setTab('open');
        clearFilters();
      }
      setDeleteTarget(null);
      setDeleteError(null);
    } else {
      setDeleteError(result.message ?? '保存失败，请重试');
    }
  }, [activeListId, clearFilters, deleteTarget, showToast, store]);

  const handleRetryStorage = useCallback(() => {
    if (store.retryStorage()) showToast('success', '本地保存已恢复');
    else showToast('error', '仍无法保存，请重试');
  }, [showToast, store]);

  if (store.status === 'loading') return <LoadingScreen />;
  if (store.status === 'issue' && store.issue) {
    return (
      <IssueScreen
        kind={store.issue.kind}
        message={store.issue.message}
        onRetry={store.initialize}
        onReset={store.resetData}
      />
    );
  }
  if (store.status === 'load-error') {
    return (
      <LoadErrorScreen
        message={store.loadError ?? '无法读取本地数据，请重试。'}
        onRetry={store.initialize}
      />
    );
  }
  if (!data) return <LoadingScreen />;

  const deleteCount = deleteTarget
    ? tasks.filter((task) => task.listId === deleteTarget.id).length
    : 0;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>

      <Sidebar
        lists={data.lists}
        counts={counts}
        selection={selection}
        theme={theme}
        onThemeChange={setTheme}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onSelectPrimary={selectPrimary}
        onSelectList={selectList}
        onNewList={() => {
          setMobileNavOpen(false);
          setListDialog({ mode: 'create' });
        }}
        onRenameList={(list) => {
          setMobileNavOpen(false);
          setListDialog({ mode: 'rename', list });
        }}
        onDeleteList={(list) => {
          setMobileNavOpen(false);
          setDeleteError(null);
          setDeleteTarget(list);
        }}
        onOpenDataNotice={() => {
          setMobileNavOpen(false);
          setDataNoticeOpen(true);
        }}
      />

      <div className="main-column">
        <Toolbar
          title={viewTitle}
          count={visibleTasks.length}
          search={search}
          priority={priority}
          onSearchChange={setSearch}
          onPriorityChange={setPriority}
          onAdd={openCreate}
          onOpenNav={() => setMobileNavOpen(true)}
        />

        {store.storageProblem ? (
          <StorageBanner message={store.storageProblem} onRetry={handleRetryStorage} />
        ) : null}

        {view === 'list' ? (
          <div className="tabs" role="tablist" aria-label={`${viewTitle}任务状态`}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'open'}
              className={`tab${tab === 'open' ? ' is-active' : ''}`}
              onClick={() => selectTab('open')}
            >
              待完成
              <span className="tab-count">{counts.lists[activeListId ?? ''] ?? 0}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'completed'}
              className={`tab${tab === 'completed' ? ' is-active' : ''}`}
              onClick={() => selectTab('completed')}
            >
              已完成
            </button>
          </div>
        ) : null}

        <main className="content" id="main-content">
          {visibleTasks.length === 0 ? (
            <EmptyState
              view={view}
              tab={tab}
              listName={currentList?.name}
              firstUse={firstUse}
              filtersActive={filtersActive}
              onAdd={openCreate}
              onClearFilters={clearFilters}
            />
          ) : (
            <TaskList
              groups={groups}
              today={today}
              showListName={view !== 'list'}
              listNames={listNames}
              onToggle={handleToggle}
              onOpen={openEdit}
            />
          )}
        </main>
      </div>

      {detail ? (
        <TaskDetail
          key={`${detail.mode}-${detail.mode === 'edit' ? detail.taskId : 'new'}-${detail.session}`}
          mode={detail.mode}
          task={openDetailTask}
          lists={lists}
          initialListId={
            detail.mode === 'create'
              ? detail.listId
              : openDetailTask?.listId ?? INBOX_ID
          }
          initialDueDate={detail.mode === 'create' ? detail.dueDate : null}
          onClose={() => setDetail(null)}
          onReloadLatest={handleReloadLatest}
          onSave={handleSave}
          onDelete={handleDeleteTask}
        />
      ) : null}

      {listDialog ? (
        <ListDialog
          key={listDialog.mode === 'rename' ? listDialog.list.id : 'create'}
          mode={listDialog.mode}
          list={listDialog.mode === 'rename' ? listDialog.list : undefined}
          onClose={() => setListDialog(null)}
          onSubmit={submitList}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="删除清单"
          message={
            <>
              <p>
                清单「{deleteTarget.name}」内共有 {deleteCount} 个任务（包含已完成任务）。
              </p>
              <p>清单内的全部任务将移至收集箱，任务会保留。</p>
            </>
          }
          cancelLabel="取消"
          confirmLabel="删除清单"
          danger
          error={deleteError}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(null);
          }}
          onConfirm={confirmDeleteList}
        />
      ) : null}

      {dataNoticeOpen ? <DataNotice onClose={() => setDataNoticeOpen(false)} /> : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
