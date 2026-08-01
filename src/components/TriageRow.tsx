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
 *   [Low][Medium][High]   [Quick][Moderate][Heavy]
 *
 * Not a reuse of ChecklistItem: that calls useSortable, which throws without a
 * DndContext ancestor, and this view has no drag.
 */

// Content-sized, not fixed-width and not flex-1. Both axes have to share one
// line inside a ~356px card at the xl breakpoint, and a width wide enough for
// "Moderate" applied to all six segments does not fit. Sizing to the label
// spends the width only where a label actually needs it. flex-1 is worse still:
// it stretches each segment to a share of the card, which reads as a form field
// rather than a toggle.
const SEG =
  'shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium leading-5 transition-colors';
const SEG_OFF = 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50';

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

      {/* Both axes on one line. The "Impact" / "Effort" captions are dropped to
          buy the width: they cost ~100px of a ~356px card interior, which is
          the whole reason the two clusters could not share a line. The grouping
          is carried by proximity instead — gap-1 within an axis against gap-5
          between them — and the two vocabularies are disjoint, so no segment is
          ambiguous about which axis it belongs to. aria-label still names them
          for screen readers, which never saw the captions as labels anyway.

          flex-wrap is a safety valve, not the intent: it only engages if the
          row genuinely cannot fit, and dropping to two lines beats being
          clipped by the card's overflow-hidden edge. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div role="group" aria-label="Impact" className="flex items-center gap-1">
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

        <div role="group" aria-label="Effort" className="flex items-center gap-1">
          {EFFORT_ORDER.map((value) => {
            const active = item.effort === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                title={active ? 'Click again to clear' : undefined}
                onClick={() => setEffort(value)}
                className={`${SEG} ${
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
  );
};
