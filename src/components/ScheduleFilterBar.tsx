import { useId, useState } from 'react';
import { Effort, EFFORT_META, EFFORT_ORDER, Impact, IMPACT_META, IMPACT_ORDER } from '../types';
import { SEG, SEG_OFF } from '../utils/chips';
import { EMPTY_SCHEDULE_FILTER, isFilterActive, ScheduleFilter } from '../utils/schedule';

interface ScheduleFilterBarProps {
  filter: ScheduleFilter;
  onChange: (next: ScheduleFilter) => void;
}

// Fixed width so both axis labels line up and the chip rows start on the same
// column; w-11 fits "Impact" and "Effort" at this size.
const AXIS_LABEL = 'w-11 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400';

/**
 * Adds or removes a value, rebuilding from `order` on add so the array is always
 * in canonical order rather than click order. Two filters that select the same
 * things are then the same array, and the collapsed summary reads Low · Medium ·
 * High no matter which chip was pressed first.
 */
const toggle = <T,>(order: T[], list: T[], value: T): T[] =>
  list.includes(value)
    ? list.filter((v) => v !== value)
    : order.filter((v) => v === value || list.includes(v));

/** 'High, Medium · Quick · Untriaged' — what is on, for the collapsed trigger. */
const summarize = (f: ScheduleFilter): string => {
  const parts: string[] = [];
  if (f.impacts.length > 0) parts.push(f.impacts.map((i) => IMPACT_META[i].label).join(', '));
  if (f.efforts.length > 0) parts.push(f.efforts.map((e) => EFFORT_META[e].label).join(', '));
  if (f.untriaged) parts.push('Untriaged');
  return parts.join(' · ');
};

/**
 * Impact/effort filter for the unscheduled backlog.
 *
 * Deliberately NOT a card. An earlier pass gave this the same white rounded
 * panel with a gray header bar that CollapsibleGroupCard uses, which turned the
 * column into a stack of identical-looking cards where the first one was not a
 * checklist. Chrome has to look like chrome: this is a bare toggle sitting on
 * the page background, above and outside the scroller that holds the cards.
 *
 * Two axis rows rather than a nine-cell grid of pairs: the column is a third of
 * the page, and the questions actually asked here are one-dimensional ("what's
 * high impact", "what's quick") far more often than they are a specific pair.
 * The pair is still reachable — press one chip in each row.
 *
 * Collapsed by default; expanded it costs ~90px off a column whose entire job is
 * showing the backlog.
 *
 *   [ ⌄ Filter ]  High · Quick                          Clear
 *   IMPACT  [Low] [Medium] [High]
 *   EFFORT  [Quick] [Moderate] [Heavy]
 *           [Untriaged]
 */
export const ScheduleFilterBar = ({ filter, onChange }: ScheduleFilterBarProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const panelId = useId();
  const active = isFilterActive(filter);

  const setImpact = (value: Impact) =>
    onChange({ ...filter, impacts: toggle(IMPACT_ORDER, filter.impacts, value) });
  const setEffort = (value: Effort) =>
    onChange({ ...filter, efforts: toggle(EFFORT_ORDER, filter.efforts, value) });

  return (
    <div>
      <div className="flex items-center gap-2">
        {/* A chip, sized like every other chip here — not a full-width header
            bar, which is what read as a card title. Clear is a sibling rather
            than a child: nesting buttons is invalid, and burying Clear in the
            panel would mean expanding just to switch the filter off. */}
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

        {/* Only while collapsed: expanded, the pressed chips already say this,
            and repeating it would be noise. */}
        {collapsed && active && (
          <span className="min-w-0 truncate text-[11px] text-gray-500">{summarize(filter)}</span>
        )}

        {/* Its appearing is itself the signal that a filter is on, which is why
            it is hidden rather than disabled when nothing is set. */}
        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_SCHEDULE_FILTER)}
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
          <span className={`${AXIS_LABEL} mt-1.5`}>Impact</span>
          {/* flex-wrap is a safety valve for a narrow column, not the intent —
              three chips fit on one line at every supported width. */}
          <div
            role="group"
            aria-label="Filter by impact"
            className="flex flex-wrap items-center gap-1"
          >
            {IMPACT_ORDER.map((value) => {
              const on = filter.impacts.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setImpact(value)}
                  className={`${SEG} ${
                    on ? `${IMPACT_META[value].chip} border-transparent` : SEG_OFF
                  }`}
                >
                  {IMPACT_META[value].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <span className={`${AXIS_LABEL} mt-1.5`}>Effort</span>
          <div
            role="group"
            aria-label="Filter by effort"
            className="flex flex-wrap items-center gap-1"
          >
            {EFFORT_ORDER.map((value) => {
              const on = filter.efforts.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setEffort(value)}
                  className={`${SEG} ${
                    on ? `${EFFORT_META[value].chip} border-transparent` : SEG_OFF
                  }`}
                >
                  {EFFORT_META[value].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Empty spacer, not a label: Untriaged belongs to neither axis, and
              aligning it under the chips is what says so. */}
          <span className={AXIS_LABEL} aria-hidden="true" />
          <button
            type="button"
            aria-pressed={filter.untriaged}
            title="Items missing an impact, an effort, or both"
            onClick={() => onChange({ ...filter, untriaged: !filter.untriaged })}
            // Slate rather than a palette colour: this is not a value on either
            // axis, and blue/amber/green all already mean something specific in
            // the rows above.
            className={`${SEG} ${
              filter.untriaged ? 'border-transparent bg-slate-200 text-slate-700' : SEG_OFF
            }`}
          >
            Untriaged
          </button>
        </div>
      </div>
    </div>
  );
};
