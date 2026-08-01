import { useMemo } from 'react';
import { useChecklistStore } from '../store/checklistStore';
import { useViewStore } from '../store/uiStore';
import { todayLocalISO } from '../utils/dates';
import { buildScheduleBuckets, DaySection } from '../utils/schedule';
import { CollapsibleGroupCard } from './CollapsibleGroupCard';
import { ScheduleRow } from './ScheduleRow';

/**
 * Full-page desktop view. Unscheduled backlog on the left, dated agenda on the
 * right: you pull items out of the left column by giving them a date and watch
 * them land in the right.
 *
 * Layout mirrors PriorityView exactly — two independent scrollers at xl so the
 * agenda stays parked in view while you work the backlog, stacking below xl
 * where the page reverts to document scroll.
 */
export const ScheduleView = () => {
  // Select the array itself; a selector returning a freshly-built object each
  // call makes useSyncExternalStore loop.
  const checklists = useChecklistStore((s) => s.checklists);
  const setView = useViewStore((s) => s.setView);

  // Computed in the body and passed as a dep, not captured inside the memo: a
  // tab left open across midnight re-derives its buckets on the next store
  // change instead of staying frozen on yesterday.
  const today = todayLocalISO();

  const { groups, sections, unscheduledCount, agendaCount } = useMemo(
    () => buildScheduleBuckets(checklists, today),
    [checklists, today]
  );

  // After the useMemo, never before it — rules of hooks.
  if (unscheduledCount === 0 && agendaCount === 0) {
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
        {/* 1/3 · 2/3, same split as the priority view: the backlog is a stack
            of fixed-height rows, while the agenda carries longer rows plus a
            section heading each and is where the reading happens. */}
        <div className="grid h-full grid-cols-1 gap-6 xl:grid-cols-3">
          {/* min-h-0 is load-bearing: without it a flex child refuses to shrink
              below its content height and the overflow never engages. */}
          <section className="flex flex-col xl:min-h-0">
            {/* Header stays mounted even at zero, so the page doesn't jump when
                the last row leaves. */}
            <div className="flex shrink-0 items-baseline gap-2">
              <h2 className="text-base font-semibold text-gray-700">Unscheduled</h2>
              <span className="text-sm text-gray-400">{unscheduledCount}</span>
            </div>
            <div className="mt-3 space-y-4 xl:flex-1 xl:overflow-y-auto xl:pr-1">
              {groups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
                  Nothing unscheduled — every item has a date.
                </div>
              ) : (
                groups.map((group) => (
                  <CollapsibleGroupCard
                    key={group.checklistId}
                    title={group.title}
                    count={group.items.length}
                  >
                    {group.items.map((item) => (
                      <ScheduleRow
                        key={item.id}
                        item={item}
                        checklistId={group.checklistId}
                        today={today}
                      />
                    ))}
                  </CollapsibleGroupCard>
                ))
              )}
            </div>
          </section>

          <section className="flex flex-col xl:col-span-2 xl:min-h-0">
            <div className="flex shrink-0 items-baseline gap-2">
              <h2 className="text-base font-semibold text-gray-700">Agenda</h2>
              <span className="text-sm text-gray-400">{agendaCount}</span>
            </div>
            <div className="mt-3 space-y-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
              {sections.map((section) => (
                <AgendaSection key={section.key} section={section} today={today} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

/**
 * One dated bucket. Not collapsible: the agenda's sections are the structure
 * you came here to read, and there are only ever as many as have items.
 */
const AgendaSection = ({ section, today }: { section: DaySection; today: string }) => {
  const overdue = section.kind === 'overdue';

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <h3
        className={`flex items-center gap-2 border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
          // Red tint on Overdue only. Today is emphasised by weight, not color:
          // it is the normal case, and coloring it too would leave nothing for
          // the exception to stand out against.
          overdue
            ? 'border-red-100 bg-red-50 text-red-700'
            : 'border-gray-100 bg-gray-50 text-gray-500'
        }`}
      >
        <span className={section.kind === 'today' ? 'text-gray-800' : undefined}>
          {section.label}
        </span>
        {section.sublabel && (
          <span className="font-normal normal-case tracking-normal text-gray-400">
            · {section.sublabel}
          </span>
        )}
        <span
          className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            overdue ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
          }`}
        >
          {section.entries.length}
        </span>
      </h3>

      {section.entries.length === 0 ? (
        // Only Today can be empty — every other section exists because it has
        // entries. "Nothing scheduled" is information, not a broken view.
        <div className="px-4 py-6 text-center text-sm text-gray-400">Nothing scheduled today.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {section.entries.map((entry) => (
            <ScheduleRow
              key={entry.item.id}
              item={entry.item}
              checklistId={entry.checklistId}
              checklistTitle={entry.checklistTitle}
              today={today}
            />
          ))}
        </div>
      )}
    </div>
  );
};
