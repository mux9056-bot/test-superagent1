import { useEffect, useRef, useState } from 'react';
import type { NavCounts, ViewSelection } from '../domain/selectors';
import type { TodoList, ViewKey } from '../domain/types';
import { INBOX_ID } from '../domain/types';
import { customLists, orderedLists } from '../domain/lists';
import type { ThemeId } from '../theme';
import { Icon, type IconName } from './Icon';
import { ThemeSwitcher } from './ThemeSwitcher';

interface SidebarProps {
  lists: TodoList[];
  counts: NavCounts;
  selection: ViewSelection;
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectPrimary: (view: Exclude<ViewKey, 'list'>) => void;
  onSelectList: (listId: string) => void;
  onNewList: () => void;
  onRenameList: (list: TodoList) => void;
  onDeleteList: (list: TodoList) => void;
  onOpenDataNotice: () => void;
}

const PRIMARY_NAV: Array<{ view: Exclude<ViewKey, 'list'>; label: string; icon: IconName }> = [
  { view: 'today', label: '今日', icon: 'today' },
  { view: 'next7', label: '未来 7 天', icon: 'calendar' },
  { view: 'all', label: '全部待办', icon: 'list' },
  { view: 'completed', label: '已完成', icon: 'check-circle' },
];

export function Sidebar({
  lists,
  counts,
  selection,
  theme,
  onThemeChange,
  mobileOpen,
  onCloseMobile,
  onSelectPrimary,
  onSelectList,
  onNewList,
  onRenameList,
  onDeleteList,
  onOpenDataNotice,
}: SidebarProps) {
  const [menuListId, setMenuListId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const ordered = orderedLists(lists);
  const inbox = ordered.find((list) => list.id === INBOX_ID);
  const others = customLists(lists);

  useEffect(() => {
    if (!menuListId) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuListId(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuListId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuListId]);

  useEffect(() => {
    if (menuListId) {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
  }, [menuListId]);

  const navCount = (count: number) => (count > 0 ? count : undefined);

  return (
    <>
      {mobileOpen ? (
        <div className="nav-scrim" aria-hidden="true" onClick={onCloseMobile} />
      ) : null}
      <aside className={`sidebar${mobileOpen ? ' is-open' : ''}`} aria-label="任务导航">
        <div className="sidebar-head">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Icon name="check" size={16} />
            </span>
            <span className="brand-text">
              <strong>Todo</strong>
              <span>个人待办</span>
            </span>
          </div>
          <button
            type="button"
            className="icon-button sidebar-close"
            aria-label="关闭导航"
            onClick={onCloseMobile}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {PRIMARY_NAV.map((item) => {
              const active = selection.view === item.view;
              const count = counts[item.view];
              return (
                <li key={item.view}>
                  <button
                    type="button"
                    className={`nav-item${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onSelectPrimary(item.view)}
                  >
                    <Icon name={item.icon} size={18} />
                    <span className="nav-label">{item.label}</span>
                    {navCount(count) !== undefined ? (
                      <span className="nav-count">{count}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="nav-section-head">
            <span id="lists-heading">清单</span>
            <button
              type="button"
              className="icon-button icon-button-small"
              aria-label="新建清单"
              title="新建清单"
              onClick={onNewList}
            >
              <Icon name="plus" size={18} />
            </button>
          </div>

          <ul className="nav-list" aria-labelledby="lists-heading">
            {inbox ? (
              <li>
                <button
                  type="button"
                  className={`nav-item${
                    selection.view === 'list' && selection.listId === inbox.id ? ' is-active' : ''
                  }`}
                  aria-current={
                    selection.view === 'list' && selection.listId === inbox.id ? 'page' : undefined
                  }
                  onClick={() => onSelectList(inbox.id)}
                >
                  <Icon name="inbox" size={18} />
                  <span className="nav-label">{inbox.name}</span>
                  {navCount(counts.lists[inbox.id] ?? 0) !== undefined ? (
                    <span className="nav-count">{counts.lists[inbox.id]}</span>
                  ) : null}
                </button>
              </li>
            ) : null}

            {others.map((list) => {
              const active = selection.view === 'list' && selection.listId === list.id;
              const menuOpen = menuListId === list.id;
              return (
                <li key={list.id} className="nav-list-item">
                  <button
                    type="button"
                    className={`nav-item${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onSelectList(list.id)}
                  >
                    <Icon name="hash" size={18} />
                    <span className="nav-label">{list.name}</span>
                    {navCount(counts.lists[list.id] ?? 0) !== undefined ? (
                      <span className="nav-count">{counts.lists[list.id]}</span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button-small list-menu-button"
                    aria-label={`「${list.name}」清单操作`}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuListId(menuOpen ? null : list.id);
                    }}
                  >
                    <Icon name="more" size={18} />
                  </button>
                  {menuOpen ? (
                    <div
                      ref={menuRef}
                      className="list-menu"
                      role="menu"
                      aria-label={`「${list.name}」清单操作`}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.stopPropagation();
                          setMenuListId(null);
                        }
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuListId(null);
                          onRenameList(list);
                        }}
                      >
                        <Icon name="edit" size={16} />
                        重命名
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="danger-text"
                        onClick={() => {
                          setMenuListId(null);
                          onDeleteList(list);
                        }}
                      >
                        <Icon name="trash" size={16} />
                        删除清单
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <ThemeSwitcher theme={theme} onChange={onThemeChange} />
          <button type="button" className="sidebar-footer-button" onClick={onOpenDataNotice}>
            <Icon name="info" size={17} />
            <span>
              <strong>数据说明</strong>
              <small>数据保存在此浏览器</small>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
