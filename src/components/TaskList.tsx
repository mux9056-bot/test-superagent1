import { formatDateLabel } from '../domain/date';
import type { Task } from '../domain/types';
import { PRIORITY_LABEL } from '../domain/types';
import type { TaskGroup } from '../domain/selectors';
import { Icon } from './Icon';

interface TaskListProps {
  groups: TaskGroup[];
  today: string;
  showListName: boolean;
  listNames: Record<string, string>;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
}

export function TaskList({
  groups,
  today,
  showListName,
  listNames,
  onToggle,
  onOpen,
}: TaskListProps) {
  return (
    <div className="task-groups">
      {groups.map((group) => (
        <section
          key={group.key}
          className={`task-group${group.kind === 'overdue' ? ' is-overdue' : ''}`}
          aria-label={group.label ?? '任务列表'}
        >
          {group.label ? (
            <h2 className="group-heading">
              <span>{group.label}</span>
              <span className="group-count">{group.tasks.length}</span>
            </h2>
          ) : null}
          <ul className="task-list">
            {group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                listName={listNames[task.listId] ?? '收集箱'}
                showListName={showListName}
                onToggle={onToggle}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TaskRow({
  task,
  today,
  listName,
  showListName,
  onToggle,
  onOpen,
}: {
  task: Task;
  today: string;
  listName: string;
  showListName: boolean;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
}) {
  const completed = task.status === 'completed';
  const overdue = !completed && task.dueDate !== null && task.dueDate < today;
  const completionLabel = completed
    ? `重新打开任务「${task.title}」`
    : `完成任务「${task.title}」`;

  return (
    <li className={`task-row${completed ? ' is-completed' : ''}`}>
      <button
        type="button"
        className="complete-button"
        aria-pressed={completed}
        aria-label={completionLabel}
        onClick={() => onToggle(task)}
      >
        <span className="complete-box">{completed ? <Icon name="check" size={14} /> : null}</span>
      </button>
      <div className="task-main">
        <button type="button" className="task-open" onClick={() => onOpen(task)}>
          <span className="task-title">{task.title}</span>
        </button>
        <div className="task-meta">
          <span className={`chip chip-priority chip-priority-${task.priority}`}>
            {PRIORITY_LABEL[task.priority]}优先级
          </span>
          {task.dueDate ? (
            <span className={`chip chip-date${overdue ? ' chip-overdue' : ''}`}>
              <Icon name="calendar" size={13} />
              {formatDateLabel(task.dueDate, today)}
              {overdue ? <span className="overdue-text">· 已逾期</span> : null}
            </span>
          ) : null}
          {showListName ? (
            <span className="chip chip-list">
              <Icon name="hash" size={13} />
              {listName}
            </span>
          ) : null}
          {task.description ? (
            <span className="chip chip-note">
              <Icon name="note" size={13} />
              有备注
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
