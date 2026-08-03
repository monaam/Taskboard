import { ChecklistItem } from '../types';
import { useChecklistStore } from '../store/checklistStore';
import { useItemDetailStore } from '../store/uiStore';
import { addDaysISO, DATE_RE, formatDateShort, isOverdue, isToday } from '../utils/dates';
import { getPriorityTag } from '../utils/priority';

interface ScheduleRowProps {
  item: ChecklistItem;
  checklistId: string;
  /** Shown only in the agenda, which is flat across checklists. */
  checklistTitle?: string;
  today: string;
}

// Matches TriageRow's segments: content-sized, not flex-1, so a quick-set
// button reads as a toggle rather than a form field.
const SEG =
  'shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium leading-5 transition-colors';
const SEG_OFF = 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50';
const SEG_ON = 'bg-blue-100 text-blue-700 border-transparent';

/**
 * One item on two lines, used in BOTH columns — the unscheduled backlog and the
 * agenda. A single component is the point: the row you use to give something a
 * date is the same row you then see it sitting in, so nothing about it changes
 * as it moves between columns except which section it renders in.
 *
 *   Rotate the production JWT secret    Ops   Due Aug 4   High · Quick   ⚙
 *   [Today] [Tomorrow]  [ 2026-08-01 ]  ×
 */
export const ScheduleRow = ({ item, checklistId, checklistTitle, today }: ScheduleRowProps) => {
  const updateItemFields = useChecklistStore((s) => s.updateItemFields);
  const toggleItemComplete = useChecklistStore((s) => s.toggleItemComplete);

  const scheduled = item.scheduledFor ?? '';
  const priority = getPriorityTag(item.impact, item.effort);
  const tomorrow = addDaysISO(today, 1);

  // Same contract as ItemDetailPanel's commitDate — updateItemFields merges
  // optimistically and never rolls back, so anything the server would reject
  // has to be filtered out here.
  const commit = (raw: string) => {
    // '' is a 400 from the server; null is the only clearing value.
    const next = raw === '' ? null : raw;
    // Date inputs can emit out-of-range values like 275760-09-13.
    if (next !== null && !DATE_RE.test(next)) return;
    // Skip no-ops so two in-flight PATCHes can't race.
    if ((item.scheduledFor ?? null) === next) return;
    updateItemFields(checklistId, item.id, { scheduledFor: next });
  };

  // Clicking the highlighted button clears — the same "click active to clear"
  // idiom TriageRow already teaches for impact and effort.
  const toggle = (date: string) => commit(scheduled === date ? '' : date);

  const dueClass = item.dueDate
    ? isOverdue(item.dueDate, today)
      ? 'bg-red-100 text-red-700'
      : isToday(item.dueDate, today)
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-600'
    : '';

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-2">
        {/* Checking it removes the row: isEligible drops completed items from
            both views, which is the contract — these are "what to do next"
            surfaces, and the board is where done work lives. checked is bound to
            the real field rather than hardcoded false even though a completed
            item never renders here, so the control can't lie if that ever
            changes. */}
        <input
          type="checkbox"
          checked={item.completed}
          onChange={() => toggleItemComplete(checklistId, item.id)}
          aria-label="Mark complete"
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-0"
        />

        {/* No truncation: you have to be able to read an item to schedule it. */}
        <p className="min-w-0 flex-1 break-words text-sm text-gray-800">{item.text}</p>

        {/* Only the agenda passes this — the backlog is already grouped by
            checklist, so repeating the name on every row would be noise. */}
        {checklistTitle && (
          <span className="mt-0.5 max-w-[9rem] shrink-0 truncate text-[10px] uppercase tracking-wide text-gray-400">
            {checklistTitle}
          </span>
        )}

        {item.dueDate && (
          <span
            title={`Due ${item.dueDate}`}
            className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium leading-4 ${dueClass}`}
          >
            Due {formatDateShort(item.dueDate)}
          </span>
        )}

        {priority && (
          <span
            title={priority.title}
            className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium leading-4 ${priority.chip}`}
          >
            {priority.label}
          </span>
        )}

        <button
          type="button"
          aria-label="Item details"
          // Imperative so a row never subscribes to panel state — every row
          // would re-render on each open/close otherwise.
          onClick={() => useItemDetailStore.getState().openItemDetail(item.id)}
          className="-mr-1 -mt-1 shrink-0 p-1 text-gray-400 transition-colors hover:text-blue-500"
        >
          {/* Same sliders glyph the board and triage rows use for this action. */}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        </button>
      </div>

      {/* Two shortcuts cover the overwhelming majority of scheduling; the date
          input is the escape hatch for everything else. flex-wrap is a safety
          valve, not the intent — it only engages if the row genuinely cannot
          fit, and two lines beat being clipped by the card's overflow-hidden
          edge. */}
      {/* pl-6 = the checkbox (h-4) plus the gap-2 above it, so the controls line
          up under the item text rather than under its checkbox. */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
        <button
          type="button"
          aria-pressed={scheduled === today}
          title={scheduled === today ? 'Click again to clear' : undefined}
          onClick={() => toggle(today)}
          className={`${SEG} ${scheduled === today ? SEG_ON : SEG_OFF}`}
        >
          Today
        </button>
        <button
          type="button"
          aria-pressed={scheduled === tomorrow}
          title={scheduled === tomorrow ? 'Click again to clear' : undefined}
          onClick={() => toggle(tomorrow)}
          className={`${SEG} ${scheduled === tomorrow ? SEG_ON : SEG_OFF}`}
        >
          Tomorrow
        </button>

        <input
          type="date"
          // Never undefined: React logs an uncontrolled-to-controlled switch.
          value={scheduled}
          min="1900-01-01"
          max="2999-12-31"
          onChange={(e) => commit(e.target.value)}
          aria-label="Scheduled for"
          className="min-w-0 shrink rounded-md border border-gray-200 px-2 py-1 text-[11px] leading-5 text-gray-700 outline-none focus:border-blue-400"
        />

        {/* Chrome renders a clear affordance inside the input; Safari and
            Firefox do not, so without this a mis-set date is a dead end.
            Hidden rather than disabled when empty — there is nothing to clear,
            and a permanently greyed control in every backlog row is clutter. */}
        {scheduled !== '' && (
          <button
            type="button"
            aria-label="Clear scheduled date"
            title="Clear scheduled date"
            onClick={() => commit('')}
            className="shrink-0 rounded-md px-1.5 py-1 text-xs leading-5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};
