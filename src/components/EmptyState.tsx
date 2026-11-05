import type { ListTab, ViewKey } from '../domain/types';
import { Icon } from './Icon';

interface EmptyStateProps {
  view: ViewKey;
  tab: ListTab;
  listName?: string;
  firstUse: boolean;
  filtersActive: boolean;
  onAdd: () => void;
  onClearFilters: () => void;
}

interface Copy {
  title: string;
  description: string;
  addLabel?: string;
}

function copyFor(
  view: ViewKey,
  tab: ListTab,
  firstUse: boolean,
  listName?: string,
): Copy {
  if (firstUse) {
    return {
      title: '从第一件小事开始',
      description: '记下要做的事，数据只保存在这个浏览器里。',
      addLabel: '新增任务',
    };
  }
  switch (view) {
    case 'today':
      return {
        title: '今天没有待办事项',
        description: '可以新增一条今天到期的任务，或去未来 7 天看看。',
        addLabel: '新增任务',
      };
    case 'next7':
      return {
        title: '未来 7 天暂无安排',
        description: '给任务设置一个到期日期，它就会出现在这里。',
        addLabel: '新增任务',
      };
    case 'all':
      return {
        title: '暂无待办任务',
        description: '所有未完成的任务都会汇总在这里。',
        addLabel: '新增任务',
      };
    case 'completed':
      return {
        title: '还没有已完成的任务',
        description: '完成任务后，可以在这里持续查阅和编辑。',
      };
    case 'list':
      return tab === 'open'
        ? {
            title: '这个清单还没有任务',
            description: `在「${listName ?? '当前清单'}」中新增第一条任务吧。`,
            addLabel: '新增任务',
          }
        : {
            title: '还没有已完成的任务',
            description: '这个清单中完成的任务会显示在这里。',
          };
    default:
      return { title: '暂无任务', description: '新增一条任务开始使用。', addLabel: '新增任务' };
  }
}

export function EmptyState({
  view,
  tab,
  listName,
  firstUse,
  filtersActive,
  onAdd,
  onClearFilters,
}: EmptyStateProps) {
  if (filtersActive) {
    return (
      <div className="empty-state">
        <span className="empty-icon" aria-hidden="true">
          <Icon name="search" size={30} />
        </span>
        <h2>没有符合条件的任务</h2>
        <p>调整关键词或优先级筛选，也可以清空全部筛选条件。</p>
        <button type="button" className="button button-secondary" onClick={onClearFilters}>
          清空搜索与筛选
        </button>
      </div>
    );
  }

  const copy = copyFor(view, tab, firstUse, listName);
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        <Icon name="check-circle" size={30} />
      </span>
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      {copy.addLabel ? (
        <button type="button" className="button button-primary" onClick={onAdd}>
          <Icon name="plus" size={18} />
          {copy.addLabel}
        </button>
      ) : null}
    </div>
  );
}
