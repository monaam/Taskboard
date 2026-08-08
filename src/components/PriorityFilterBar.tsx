import { useId, useState } from 'react';
import { SEG, SEG_OFF } from '../utils/chips';
import {
  EMPTY_PRIORITY_FILTER,
  isPriorityFilterActive,
  MatrixSource,
  PriorityFilter,
  ScheduleState,
} from '../utils/matrix';

interface PriorityFilterBarProps {
  filter: PriorityFilter;
  onChange: (next: PriorityFilter) => void;
  /** Every checklist with something in the matrix, unfiltered and in board order. */
  sources: MatrixSource[];
}

// w-16 rather than ScheduleFilterBar's w-11: "Schedule" is longer than "Impact"
// and wraps at that width.
const AXIS_LABEL = 'w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400';

const SCHEDULE_SEGMENTS: { value: ScheduleState; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'unscheduled', label: 'Not scheduled' },
];

/** 'Not scheduled · Overdue · Work' — what is on, for the collapsed trigger. */
const summarize = (f: PriorityFilter, sources: MatrixSource[]): string => {
  const parts: string[] = [];
  if (f.schedule !== 'any') {
    parts.push(f.schedule === 'scheduled' ? 'Scheduled' : 'Not scheduled');
  }
  if (f.overdue) parts.push('Overdue');
  if (f.checklistIds.length > 0) {
    // Driven off `sources`, not off the id array, so the titles come out in
    // board order and read the same as the chip row below no matter which chip
    // was pressed first.
    parts.push(
      sources
        .filter((s) => f.checklistIds.includes(s.checklistId))
        .map((s) => s.title)
        .join(', ')
    );
  }
  return parts.join(' · ');
};

/**
 * Schedule/overdue/source filter for the prioritized matrix.
 *
 * Same chrome as ScheduleFilterBar — a bare row of chips on the page
 * background, above and outside the scroller, collapsed by default. Not a card:
 * chrome has to look like chrome.
 *
 *   [ ⌄ Filter ]  Not scheduled · Overdue                  Clear
 *   SCHEDULE  [ Any | Scheduled | Not scheduled ]
 *             [Overdue]
 *   LIST      [Work] [Home] [Side project]
 */
export const PriorityFilterBar = ({ filter, onChange, sources }: PriorityFilterBarProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const panelId = useId();
  const active = isPriorityFilterActive(filter);

  // Order is not canonicalized the way ScheduleFilterBar's axes are, because
  // nothing reads this array's order: both the chip row and the summary render
  // from `sources`.
  const toggleChecklist = (id: string) =>
    onChange({
      ...filter,
      checklistIds: filter.checklistIds.includes(id)
        ? filter.checklistIds.filter((v) => v !== id)
        : [...filter.checklistIds, id],
    });

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={panelId}
          onClick={() => setCollapsed((c) => !c)}
          className={`${SEG} ${SEG_OFF} inline-flex items-center gap-1`}
        >
          <svg
            className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${
              collapsed ? '-rotate-90' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Filter
        </button>

        {/* Only while collapsed: expanded, the lit controls already say this. */}
        {collapsed && active && (
          <span className="min-w-0 truncate text-[11px] text-gray-500">
            {summarize(filter, sources)}
          </span>
        )}

        {/* Its appearing is itself the signal that a filter is on, which is why
            it is hidden rather than disabled when nothing is set. */}
        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_PRIORITY_FILTER)}
            className="ml-auto shrink-0 rounded-md px-1.5 py-1 text-[11px] leading-5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Hidden by class rather than unmounted, so aria-controls always points
          at a node that exists. */}
      <div id={panelId} className={collapsed ? 'hidden' : 'mt-2 space-y-1.5'}>
        <div className="flex items-start gap-2">
          <span className={`${AXIS_LABEL} mt-1.5`}>Schedule</span>
          {/* One border around the group and none on the buttons: this is one
              control with three positions, and three free-standing chips would
              imply three independent toggles. radiogroup for the same reason —
              exactly one is always on, which is not what aria-pressed means. */}
          <div
            role="radiogroup"
            aria-label="Filter by schedule"
            className="inline-flex shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white"
          >
            {SCHEDULE_SEGMENTS.map(({ value, label }) => {
              const on = filter.schedule === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onChange({ ...filter, schedule: value })}
                  // Slate, not a palette colour: scheduled-ness is not a value
                  // on either matrix axis, and the cells below already spend
                  // green/amber/red on priority tiers.
                  className={`border-l border-gray-200 px-2 py-1 text-[11px] font-medium leading-5 transition-colors first:border-l-0 ${
                    on ? 'bg-slate-200 text-slate-800' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Empty spacer, not a label: Overdue narrows whatever the segment
              above selected rather than being a fourth position on it, and
              aligning it under the control instead of beside it says so. */}
          <span className={AXIS_LABEL} aria-hidden="true" />
          <button
            type="button"
            aria-pressed={filter.overdue}
            title="Scheduled or due before today"
            onClick={() => onChange({ ...filter, overdue: !filter.overdue })}
            className={`${SEG} ${
              filter.overdue ? 'border-transparent bg-red-100 text-red-700' : SEG_OFF
            }`}
          >
            Overdue
          </button>
        </div>

        {/* One checklist means the chip can only be on or off across the whole
            matrix, which filters nothing and just costs a row. */}
        {sources.length > 1 && (
          <div className="flex items-start gap-2">
            <span className={`${AXIS_LABEL} mt-1.5`}>List</span>
            {/* flex-wrap is load-bearing here, unlike on the axes above: there
                is no bound on how many checklists a board has. */}
            <div
              role="group"
              aria-label="Filter by checklist"
              className="flex flex-wrap items-center gap-1"
            >
              {sources.map((source) => {
                const on = filter.checklistIds.includes(source.checklistId);
                return (
                  <button
                    key={source.checklistId}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleChecklist(source.checklistId)}
                    className={`${SEG} max-w-[10rem] truncate ${
                      on ? 'border-transparent bg-slate-200 text-slate-700' : SEG_OFF
                    }`}
                  >
                    {source.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
