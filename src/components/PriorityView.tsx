import { useId, useMemo, useState } from 'react';
import { ChecklistItem } from '../types';
import { useChecklistStore } from '../store/checklistStore';
import { useViewStore } from '../store/uiStore';
import { cellKey, PriorityEntry, TriageGroup } from '../utils/matrix';
import { PriorityMatrix } from './PriorityMatrix';
import { TriageRow } from './TriageRow';

// Blank rows exist (insertItemAfter creates text:'' before the user types) and
// are unidentifiable in a cross-checklist list. Completed items are done — this
// is a "what to do next" surface.
const isEligible = (i: ChecklistItem) => !i.completed && i.text.trim() !== '';

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

  const { groups, cells, untriagedCount, triagedCount, isEmpty } = useMemo(() => {
    const nextGroups: TriageGroup[] = [];
    const nextCells = new Map<string, PriorityEntry[]>();
    let untriaged = 0;
    let triaged = 0;
    let anyEligible = false;

    // Checklists in array order, items in array order — the board's ordering is
    // preserved verbatim in both sections.
    for (const checklist of checklists) {
      const pending: ChecklistItem[] = [];
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
        } else {
          pending.push(item);
          untriaged += 1;
        }
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
      untriagedCount: untriaged,
      triagedCount: triaged,
      isEmpty: !anyEligible,
    };
  }, [checklists]);

  // After the useMemo, never before it — rules of hooks.
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
        <div className="grid h-full grid-cols-1 gap-6 xl:grid-cols-2">
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

          <section className="flex flex-col xl:min-h-0">
            <div className="flex shrink-0 items-baseline gap-2">
              <h2 className="text-base font-semibold text-gray-700">Prioritized</h2>
              <span className="text-sm text-gray-400">{triagedCount}</span>
            </div>
            {/* min-h-0 gives this a definite height for the matrix's h-full to
                resolve against. The overflow here is only a fallback for a
                viewport too short for the grid's row minimums — normally the
                grid fits exactly and each cell scrolls internally instead. */}
            <div className="mt-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
              {triagedCount === 0 ? (
                // One placeholder rather than a wall of nine empty cells.
                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
                  Nothing prioritized yet — set an impact and an effort to place an item here.
                </div>
              ) : (
                <PriorityMatrix cells={cells} />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

/**
 * One checklist's untriaged rows, collapsible.
 *
 * Collapse state is deliberately ephemeral and local: it is scoped to a triage
 * session, and the card unmounts on its own once its last item is triaged.
 * React reconciles these by checklistId, so a card keeps its state while other
 * groups appear and disappear around it.
 */
const TriageGroupCard = ({ group }: { group: TriageGroup }) => {
  const [collapsed, setCollapsed] = useState(false);
  const panelId = useId();

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Button inside the heading, per the ARIA disclosure pattern: the
          heading keeps its place in the document outline and the button is
          what gets the expanded state. Preflight strips h3's own styling, so
          the button carries the entire appearance. */}
      <h3>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={panelId}
          onClick={() => setCollapsed((c) => !c)}
          className={`flex w-full items-center gap-2 bg-gray-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:bg-gray-100 ${
            // Transparent rather than absent when collapsed: keeps the header
            // height identical and avoids doubling up on the card's own border.
            collapsed ? 'border-b border-transparent' : 'border-b border-gray-100'
          }`}
        >
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${
              collapsed ? '-rotate-90' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="min-w-0 flex-1 truncate">{group.title}</span>
          {/* The count is the point of collapsing: it says how much work is
              still hidden in there. */}
          <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {group.items.length}
          </span>
        </button>
      </h3>
      {/* Hidden by class rather than unmounted, so aria-controls always points
          at a node that exists. */}
      <div id={panelId} className={collapsed ? 'hidden' : 'divide-y divide-gray-100'}>
        {group.items.map((item) => (
          <TriageRow key={item.id} item={item} checklistId={group.checklistId} />
        ))}
      </div>
    </div>
  );
};
