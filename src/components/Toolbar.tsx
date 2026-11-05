import type { PriorityFilter } from '../domain/types';
import { Icon } from './Icon';

interface ToolbarProps {
  title: string;
  count: number;
  search: string;
  priority: PriorityFilter;
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: PriorityFilter) => void;
  onAdd: () => void;
  onOpenNav: () => void;
}

export function Toolbar({
  title,
  count,
  search,
  priority,
  onSearchChange,
  onPriorityChange,
  onAdd,
  onOpenNav,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-top">
        <button
          type="button"
          className="icon-button menu-button"
          aria-label="打开导航菜单"
          onClick={onOpenNav}
        >
          <Icon name="menu" size={22} />
        </button>
        <div className="toolbar-title">
          <h1>{title}</h1>
          <p className="view-count" aria-live="polite">
            {count} 个任务
          </p>
        </div>
        <button type="button" className="button button-primary add-button" onClick={onAdd}>
          <Icon name="plus" size={18} />
          <span className="add-label-long">新增任务</span>
          <span className="add-label-short">新增</span>
        </button>
      </div>

      <div className="toolbar-controls">
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            type="search"
            value={search}
            placeholder="搜索当前视图"
            aria-label="搜索当前视图"
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {search ? (
            <button
              type="button"
              className="search-clear"
              aria-label="清空搜索"
              onClick={() => onSearchChange('')}
            >
              <Icon name="close" size={15} />
            </button>
          ) : null}
        </div>
        <label className="priority-filter">
          <span className="sr-only">优先级筛选</span>
          <select
            value={priority}
            aria-label="优先级筛选"
            onChange={(event) => onPriorityChange(event.target.value as PriorityFilter)}
          >
            <option value="all">全部优先级</option>
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
            <option value="low">低优先级</option>
          </select>
        </label>
      </div>
    </header>
  );
}
