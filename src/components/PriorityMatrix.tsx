import { Fragment } from 'react';
import { Effort, Impact, EFFORT_META, EFFORT_ORDER, IMPACT_META } from '../types';
import { useItemDetailStore } from '../store/uiStore';
import { formatDateShort } from '../utils/dates';
import { getPriorityChip } from '../utils/priority';
import {
  CELL_ACTIONS,
  cellKey,
  EMPTY_ENTRIES,
  MATRIX_IMPACT_ROWS,
  PriorityEntry,
} from '../utils/matrix';

interface PriorityMatrixProps {
  cells: Map<string, PriorityEntry[]>;
}

/**
 * One grid, sized by CSS — no separate mobile tree. High→Low top-to-bottom and
 * Quick→Heavy left-to-right, so the emerald "act now" corner is top-left where
 * the eye lands first.
 */
export const PriorityMatrix = ({ cells }: PriorityMatrixProps) => (
  // No spaces inside the arbitrary values — a space after a comma silently
  // drops the whole class and the template resolves to `none`.
  //
  // At xl the grid fills the column and the three body rows split the height,
  // so the 3x3 never moves: a cell with many entries scrolls inside itself
  // instead of making the whole grid tall. The 6rem floor stops a row being
  // squeezed to a sliver on a short viewport; if all three floors together
  // exceed the space, the column scroller takes over. Below xl there is no
  // bounded height, so rows size to content and the page scrolls as before.
  <div className="grid gap-1.5 grid-cols-[3.5rem_repeat(3,minmax(0,1fr))] xl:h-full xl:grid-rows-[auto_repeat(3,minmax(6rem,1fr))]">
    <div className="text-[10px] leading-tight text-gray-400 self-end pb-1">
      Impact ↓<br />Effort →
    </div>
    {EFFORT_ORDER.map((effort) => (
      <div
        key={effort}
        className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-gray-500"
      >
        {EFFORT_META[effort].label}
      </div>
    ))}

    {MATRIX_IMPACT_ROWS.map((impact) => (
      <Fragment key={impact}>
        <div className="flex items-center justify-end pr-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          {IMPACT_META[impact].label}
        </div>
        {EFFORT_ORDER.map((effort) => (
          <MatrixCell
            key={effort}
            impact={impact}
            effort={effort}
            entries={cells.get(cellKey(impact, effort)) ?? EMPTY_ENTRIES}
          />
        ))}
      </Fragment>
    ))}
  </div>
);

interface MatrixCellProps {
  impact: Impact;
  effort: Effort;
  entries: PriorityEntry[];
}

const MatrixCell = ({ impact, effort, entries }: MatrixCellProps) => (
  // xl:min-h-0 lets the cell shrink to its grid row instead of being propped
  // open by its own content — without it the list below can never scroll.
  <div className="flex min-h-[5.5rem] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white xl:min-h-0">
    {/* Tier color rides the header only. Nine saturated blocks would fight each
        other and drown the item text. shrink-0 keeps it pinned above the
        scrolling list.

        The verb, not the pair: the axis headers already say "High"/"Quick", so
        repeating them here would spend the width restating the coordinates
        instead of the conclusion. truncate because below xl a stacked cell can
        get narrow enough to clip "Break down". */}
    <div
      className={`flex shrink-0 items-center justify-between gap-1 px-2 py-1 text-[11px] font-medium ${getPriorityChip(
        impact,
        effort
      )}`}
    >
      <span className="truncate">{CELL_ACTIONS[impact][effort]}</span>
      <span className="shrink-0 tabular-nums">{entries.length}</span>
    </div>
    {entries.length === 0 ? (
      <div className="flex flex-1 items-center justify-center text-xs text-gray-300">—</div>
    ) : (
      // overscroll-contain: reaching the end of a cell must not start scrolling
      // the column behind it.
      <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto overscroll-contain">
        {entries.map((entry) => (
          <li key={entry.item.id}>
            <button
              type="button"
              onClick={() => useItemDetailStore.getState().openItemDetail(entry.item.id)}
              className="group relative w-full px-2 py-1.5 text-left hover:bg-gray-50"
            >
              <span className="flex items-center gap-1">
                {/* Essential context: a flat matrix otherwise strips the only
                    signal saying where a task came from. */}
                <span className="min-w-0 flex-1 truncate text-[10px] uppercase tracking-wide text-gray-400">
                  {entry.checklistTitle}
                </span>
                {/* Icon only, date on the row's tooltip: at ~204px a visible
                    date would cost more width than the item text can spare.
                    Same glyph and blue as the board badge in ItemBadges, so the
                    two can't drift. */}
                {entry.item.scheduledFor && (
                  <span className="shrink-0 text-blue-600">
                    <svg
                      className="h-3 w-3"
                      aria-hidden="true"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {/* title is mouse-only; without this the icon carries the
                        information visually and nowhere else. */}
                    <span className="sr-only">Scheduled {entry.item.scheduledFor}</span>
                  </span>
                )}
              </span>
              <span className="line-clamp-2 block text-xs text-gray-800">{entry.item.text}</span>
              {/* A rendered tooltip rather than the native `title` attribute,
                  which would not surface here at all. It is deliberately inset
                  inside the row's own box: the cell is overflow-hidden and the
                  list is overflow-y-auto, so anything escaping the row would be
                  clipped rather than float above it.

                  pointer-events-none keeps it from stealing the hover that
                  spawned it. group-focus mirrors group-hover so the date is
                  reachable by keyboard, not mouse only. */}
              {entry.item.scheduledFor && (
                <span className="pointer-events-none absolute bottom-1 right-1 z-10 hidden rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white shadow group-hover:block group-focus:block">
                  Scheduled {formatDateShort(entry.item.scheduledFor)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);
