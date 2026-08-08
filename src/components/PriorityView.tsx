import { useMemo, useState } from 'react';
import { ChecklistItem } from '../types';
import { useChecklistStore } from '../store/checklistStore';
import { useViewStore } from '../store/uiStore';
import { todayLocalISO } from '../utils/dates';
import { isEligible } from '../utils/items';
import {
  cellKey,
  EMPTY_PRIORITY_FILTER,
  filterMatrixCells,
  isPriorityFilterActive,
  MatrixSource,
  PriorityEntry,
  PriorityFilter,
  TriageGroup,
} from '../utils/matrix';
import { CollapsibleGroupCard } from './CollapsibleGroupCard';
import { PriorityFilterBar } from './PriorityFilterBar';
import { PriorityMatrix } from './PriorityMatrix';
import { TriageRow } from './TriageRow';

/**
 * Full-page desktop view. Full-width, not max-w-6xl: at 1152px each column gets
 * ~550px and both halves break.
 *
 * Two independent scrollers at xl, so the matrix stays parked in view while you
 * work the left column — that is the entire reason to pick side-by-side. Below
 * xl the columns stack and the page reverts to document scroll, which keeps a
 * 1024px laptop usable.
 */
export const PriorityView = () => {
  // Select the array itself; a selector returning a freshly-built object each
  // call makes useSyncExternalStore loop.
  const checklists = useChecklistStore((s) => s.checklists);
  const setView = useViewStore((s) => s.setView);

  // Computed in the body and passed as a dep, not captured inside the memo: a
  // tab left open across midnight re-derives on the next store change instead of
  // staying frozen on yesterday's idea of overdue.
  const today = todayLocalISO();

  // Local, not in uiStore: it is a working-session scratch setting scoped to one
  // column of one view, and persisting it would mean returning to a matrix that
  // silently hides most of itself.
  const [filter, setFilter] = useState<PriorityFilter>(EMPTY_PRIORITY_FILTER);

  const { groups, cells, sources, untriagedCount, triagedCount, isEmpty } = useMemo(() => {
    const nextGroups: TriageGroup[] = [];
    const nextCells = new Map<string, PriorityEntry[]>();
    const nextSources: MatrixSource[] = [];
    let untriaged = 0;
    let triaged = 0;
    let anyEligible = false;

    // Checklists in array order, items in array order — the board's ordering is
    // preserved verbatim in both sections.
    for (const checklist of checklists) {
      const pending: ChecklistItem[] = [];
      let contributed = false;
      for (const item of checklist.items) {
        if (!isEligible(item)) continue;
        anyEligible = true;
        // Inline so TS narrows both fields; factoring this into a helper would
        // force a non-null assertion below.
        if (item.impact && item.effort) {
          const key = cellKey(item.impact, item.effort);
          const entry: PriorityEntry = {
            item,
            checklistId: checklist.id,
            checklistTitle: checklist.title,
          };
          const bucket = nextCells.get(key);
          if (bucket) bucket.push(entry);
          else nextCells.set(key, [entry]);
          triaged += 1;
          contributed = true;
        } else {
          pending.push(item);
          untriaged += 1;
        }
      }
      // Built here, before any filtering, so pressing a list chip never makes
      // the other list chips disappear out from under the cursor.
      if (contributed) {
        nextSources.push({ checklistId: checklist.id, title: checklist.title });
      }
      // Emit a group only when it has something, so a fully-triaged checklist
      // shows no heading at all.
      if (pending.length > 0) {
        nextGroups.push({ checklistId: checklist.id, title: checklist.title, items: pending });
      }
    }

    return {
      groups: nextGroups,
      cells: nextCells,
      sources: nextSources,
      untriagedCount: untriaged,
      triagedCount: triaged,
      isEmpty: !anyEligible,
    };
  }, [checklists]);

  // A second pass over the matrix alone. Kept out of the memo above so the
  // triage column and its count stay whole no matter what is selected here.
  const { cells: visibleCells, count: visibleCount } = useMemo(
    () => filterMatrixCells(cells, filter, today),
    [cells, filter, today]
  );
  const filtering = isPriorityFilterActive(filter);

  // After the hooks, never before them — rules of hooks.
  if (isEmpty) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-gray-100 px-6">
        <p className="text-sm text-gray-500">No items yet.</p>
        <button
          type="button"
          onClick={() => setView('board')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
        >
          Go to the board
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-100 xl:h-screen xl:overflow-hidden">
      {/* pt-16 clears the fixed top-left cluster, which overlays this page. */}
      <div className="h-full px-6 pb-6 pt-16">
        {/* 1/3 · 2/3, not an even split: the triage column only ever holds a
            stack of fixed-height rows, while the matrix has nine cells to
            divide, so width buys it far more. At 1440px that is a 448px left
            column and ~282px matrix cells, up from 204px at 50/50. */}
        <div className="grid h-full grid-cols-1 gap-6 xl:grid-cols-3">
          {/* min-h-0 is load-bearing: without it a flex child refuses to shrink
              below its content height and the overflow never engages. */}
          <section className="flex flex-col xl:min-h-0">
            {/* Header and count stay mounted even at zero, so the page doesn't
                jump when the last row leaves. Not sticky — it is already outside
                the scroller, and a sticky heading inside would slide under the
                fixed cluster above. */}
            <div className="flex shrink-0 items-baseline gap-2">
              <h2 className="text-base font-semibold text-gray-700">To triage</h2>
              <span className="text-sm text-gray-400">{untriagedCount}</span>
            </div>
            <div className="mt-3 space-y-4 xl:flex-1 xl:overflow-y-auto xl:pr-1">
              {groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
                  Nothing to triage — every item has an impact and an effort.
                </div>
              ) : (
                groups.map((group) => <TriageGroupCard key={group.checklistId} group={group} />)
              )}
            </div>
          </section>

          <section className="flex flex-col xl:col-span-2 xl:min-h-0">
            <div className="flex shrink-0 items-baseline gap-2">
              <h2 className="text-base font-semibold text-gray-700">Prioritized</h2>
              {/* "3 of 37" while filtering: the count is what tells you the
                  matrix is sparse because you asked, not because the work is
                  done. */}
              <span className="text-sm text-gray-400">
                {filtering ? `${visibleCount} of ${triagedCount}` : triagedCount}
              </span>
            </div>

            {/* Outside the scroller and shrink-0, so the controls stay put while
                the grid moves under them. Hidden when there is nothing to
                filter. */}
            {triagedCount > 0 && (
              <div className="mt-2 shrink-0">
                <PriorityFilterBar filter={filter} onChange={setFilter} sources={sources} />
              </div>
            )}

            {/* min-h-0 gives this a definite height for the matrix's h-full to
                resolve against. The overflow here is only a fallback for a
                viewport too short for the grid's row minimums — normally the
                grid fits exactly and each cell scrolls internally instead. */}
            <div className="mt-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
              {triagedCount === 0 ? (
                // One placeholder rather than a wall of nine empty cells.
                //
                // Note this tests the UNFILTERED count. A filter that matches
                // nothing keeps the grid mounted and lets all nine cells read
                // "—": the heading says "0 of 37" and the lit chips sit directly
                // above it, so the cause is already on screen, and swapping the
                // grid for a message would make the whole matrix pop in and out
                // as you toggle a chip. The schedule view does substitute a
                // message, but its backlog is a flat list with no structure
                // worth holding still.
                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
                  Nothing prioritized yet — set an impact and an effort to place an item here.
                </div>
              ) : (
                <PriorityMatrix cells={visibleCells} />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

/** One checklist's untriaged rows. */
const TriageGroupCard = ({ group }: { group: TriageGroup }) => (
  <CollapsibleGroupCard title={group.title} count={group.items.length}>
    {group.items.map((item) => (
      <TriageRow key={item.id} item={item} checklistId={group.checklistId} />
    ))}
  </CollapsibleGroupCard>
);
