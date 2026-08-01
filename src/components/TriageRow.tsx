import {
  ChecklistItem,
  Effort,
  Impact,
  EFFORT_META,
  EFFORT_ORDER,
  IMPACT_META,
  IMPACT_ORDER,
} from '../types';
import { useChecklistStore } from '../store/checklistStore';
import { useItemDetailStore } from '../store/uiStore';

/**
 * One untriaged item, laid out on two lines:
 *
 *   Fix the login redirect bug                                          ⚙
 *   Impact [ Low ][Medium][ High ]      Effort [Quick][Moderate][Heavy]
 *
 * Not a reuse of ChecklistItem: that calls useSortable, which throws without a
 * DndContext ancestor, and this view has no drag.
 */

// Fixed-width segments, not flex-1: in a 652px card flex-1 makes each button
// ~190px wide, which reads as a form field rather than a toggle.
const SEG = 'w-16 shrink-0 rounded-md border py-1 text-xs font-medium leading-5 transition-colors';
// Effort needs the extra room — "Moderate" is the longest label in either axis.
const SEG_WIDE =
  'w-[4.5rem] shrink-0 rounded-md border py-1 text-xs font-medium leading-5 transition-colors';
const SEG_OFF = 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50';
const AXIS = 'text-[11px] font-medium uppercase tracking-wide text-gray-400 shrink-0';

interface TriageRowProps {
  item: ChecklistItem;
  checklistId: string;
}

export const TriageRow = ({ item, checklistId }: TriageRowProps) => {
  const updateItemFields = useChecklistStore((s) => s.updateItemFields);

  // Clicking the active value clears it — that is why these are aria-pressed
  // toggles in a role="group", not radios. A radio you can un-check is a lie to
  // screen readers. A toggle can never re-send the value it already holds, so
  // two identical PATCHes for one field can't race.
  const setImpact = (value: Impact) =>
    updateItemFields(checklistId, item.id, { impact: item.impact === value ? null : value });
  const setEffort = (value: Effort) =>
    updateItemFields(checklistId, item.id, { effort: item.effort === value ? null : value });

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        {/* No truncation: you have to be able to read an item to triage it. */}
        <p className="min-w-0 flex-1 break-words text-sm text-gray-800">{item.text}</p>
        <button
          type="button"
          aria-label="Item details"
          // Imperative so a row never subscribes to panel state — every row
          // would re-render on each open/close otherwise.
          onClick={() => useItemDetailStore.getState().openItemDetail(item.id)}
          className="-mt-1 -mr-1 shrink-0 p-1 text-gray-400 transition-colors hover:text-blue-500"
        >
          {/* Same sliders glyph the board rows use for this action. */}
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

      <div className="mt-2 flex items-center gap-x-8">
        <div role="group" aria-label="Impact" className="flex items-center gap-2">
          <span className={AXIS}>Impact</span>
          <div className="flex gap-1.5">
            {IMPACT_ORDER.map((value) => {
              const active = item.impact === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  title={active ? 'Click again to clear' : undefined}
                  onClick={() => setImpact(value)}
                  className={`${SEG} ${
                    active ? `${IMPACT_META[value].chip} border-transparent` : SEG_OFF
                  }`}
                >
                  {IMPACT_META[value].label}
                </button>
              );
            })}
          </div>
        </div>

        <div role="group" aria-label="Effort" className="flex items-center gap-2">
          <span className={AXIS}>Effort</span>
          <div className="flex gap-1.5">
            {EFFORT_ORDER.map((value) => {
              const active = item.effort === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  title={active ? 'Click again to clear' : undefined}
                  onClick={() => setEffort(value)}
                  className={`${SEG_WIDE} ${
                    active ? `${EFFORT_META[value].chip} border-transparent` : SEG_OFF
                  }`}
                >
                  {EFFORT_META[value].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
