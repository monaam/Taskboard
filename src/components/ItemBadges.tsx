import { ChecklistItem } from '../types';
import { formatDateShort, isOverdue, isToday, todayLocalISO } from '../utils/dates';
import { getPriorityTag } from '../utils/priority';
import { useItemDetailStore } from '../store/uiStore';

interface ItemBadgesProps {
  item: ChecklistItem;
}

const BASE = 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] leading-4 font-medium';

export const ItemBadges = ({ item }: ItemBadgesProps) => {
  const hasAny =
    !!item.scheduledFor || !!item.dueDate || !!item.impact || !!item.effort || !!item.notes;

  // Untriaged and completed rows render exactly as they did before this feature.
  if (item.completed || !hasAny) return null;

  const today = todayLocalISO();
  const priority = getPriorityTag(item.impact, item.effort);

  // Imperative open: rows must not subscribe to panel state, or every open
  // re-renders every item on the canvas.
  const open = () => useItemDetailStore.getState().openItemDetail(item.id);

  const dueClass = item.dueDate
    ? isOverdue(item.dueDate, today)
      ? 'bg-red-100 text-red-700'
      : isToday(item.dueDate, today)
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-600'
    : '';

  return (
    <div className="flex flex-wrap items-center gap-1">
      {item.scheduledFor && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          title={`Scheduled ${item.scheduledFor}`}
          className={`${BASE} bg-blue-100 text-blue-700`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {formatDateShort(item.scheduledFor)}
        </button>
      )}

      {item.dueDate && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          title={`Due ${item.dueDate}`}
          className={`${BASE} ${dueClass}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {formatDateShort(item.dueDate)}
        </button>
      )}

      {/* Impact and effort render as one tag; the combination picks the color. */}
      {priority && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          title={priority.title}
          className={`${BASE} ${priority.chip}`}
        >
          {priority.label}
        </button>
      )}

      {item.notes && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          aria-label="Has notes"
          title="Has notes"
          className={`${BASE} bg-gray-100 text-gray-500`}
        >
          {/* Page outline with a folded corner — no interior text lines, which
              turn to mush at 12px. Starts at an absolute M17 21: the original
              glyph opened this subpath with a relative `m2 5` chained off the
              text lines, so dropping them without converting would shift the
              page off the viewBox. */}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
