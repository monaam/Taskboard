import { useEffect, useMemo, useRef, useState } from 'react';
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
import { DATE_RE } from '../utils/dates';

/**
 * Must be mounted OUTSIDE <Canvas />: `.canvas-content` carries a transform,
 * which makes it the containing block for `position: fixed` descendants — a
 * sheet inside it would be positioned against the 4000x3000 canvas and scaled
 * by the zoom factor.
 *
 * Breakpoint is `md:` (768px) to match Canvas's `isMobile` media query. `sm:`
 * is 640px and would put the desktop drawer over the mobile list view in the
 * 641-768px band.
 */
export const ItemDetailPanel = () => {
  const openItemId = useItemDetailStore((s) => s.openItemId);
  const closeItemDetail = useItemDetailStore((s) => s.closeItemDetail);
  // Select the array itself; a selector returning a freshly-built object each
  // call makes useSyncExternalStore loop.
  const checklists = useChecklistStore((s) => s.checklists);

  const found = useMemo(() => {
    const checklist = openItemId
      ? checklists.find((c) => c.items.some((i) => i.id === openItemId))
      : undefined;
    const item = checklist?.items.find((i) => i.id === openItemId);
    return checklist && item ? { checklistId: checklist.id, item } : null;
  }, [checklists, openItemId]);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // The open item can vanish under us: deleteItem, deleteAllCompleted,
  // deleteChecklist, or handleSave deleting a blank row.
  useEffect(() => {
    if (openItemId && !found) closeItemDetail();
  }, [openItemId, found, closeItemDetail]);

  const foundItemId = found?.item.id;
  useEffect(() => {
    if (foundItemId) closeButtonRef.current?.focus();
  }, [foundItemId]);

  if (!openItemId || !found) return null;

  return (
    <>
      {/* Modal on mobile, non-modal drawer on desktop so the canvas stays usable. */}
      <div
        className="fixed inset-0 bg-black/30 z-[60] md:hidden"
        onClick={closeItemDetail}
      />
      <div
        tabIndex={-1}
        role="dialog"
        // No aria-modal: it cannot vary by breakpoint without JS, and it would
        // be a lie on the desktop drawer.
        aria-label="Item details"
        // Escape is handled here, not on window: React 19 attaches at the root
        // container, which is below window in the bubble path, so a window
        // listener could not preempt the text input's own Escape handler.
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            closeItemDetail();
          }
        }}
        className="fixed inset-x-0 bottom-0 z-[70] max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-white shadow-2xl outline-none md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-[380px] md:max-h-none md:rounded-none md:border-l md:border-gray-200"
      >
        {/* Key the CONTENT, not the shell: insertItemAfter/addItem swap the temp
            id for the server id once the POST resolves, and remounting the shell
            mid-edit would discard typed notes. */}
        <ItemDetailContent
          key={found.item.id}
          item={found.item}
          checklistId={found.checklistId}
          onClose={closeItemDetail}
          closeButtonRef={closeButtonRef}
        />
      </div>
    </>
  );
};

type DateField = 'scheduledFor' | 'dueDate';

interface ItemDetailContentProps {
  item: ChecklistItem;
  checklistId: string;
  onClose: () => void;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
}

const SEGMENT_BASE =
  'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors border';

const ItemDetailContent = ({ item, checklistId, onClose, closeButtonRef }: ItemDetailContentProps) => {
  const updateItemFields = useChecklistStore((s) => s.updateItemFields);

  const [notes, setNotes] = useState(item.notes ?? '');

  // updateItemFields merges optimistically and never rolls back, so anything
  // the server would reject has to be filtered out here.
  const commitDate = (field: DateField, raw: string) => {
    // '' is a 400 from the server; null is the only clearing value.
    const next = raw === '' ? null : raw;
    // Date inputs can emit out-of-range values like 275760-09-13.
    if (next !== null && !DATE_RE.test(next)) return;
    // Skip no-ops so two in-flight PATCHes can't race.
    if ((item[field] ?? null) === next) return;
    // Written out rather than computed — a computed key widens to a string
    // index signature, which Partial<Pick<...>> won't accept.
    updateItemFields(
      checklistId,
      item.id,
      field === 'dueDate' ? { dueDate: next } : { scheduledFor: next }
    );
  };

  const commitImpact = (value: Impact | null) => {
    if ((item.impact ?? null) === value) return;
    updateItemFields(checklistId, item.id, { impact: value });
  };

  const commitEffort = (value: Effort | null) => {
    if ((item.effort ?? null) === value) return;
    updateItemFields(checklistId, item.id, { effort: value });
  };

  // Blur is unreliable — browsers differ on backdrop mousedown, and it never
  // fires at all if the row disappears while the textarea has focus. Commit
  // from the unmount path too, through a ref so the effect can stay [].
  const notesCommitRef = useRef<() => void>(() => {});
  const commitNotes = () => {
    const next = notes.trim() === '' ? null : notes;
    if ((item.notes ?? null) === next) return;
    updateItemFields(checklistId, item.id, { notes: next });
  };
  useEffect(() => {
    notesCommitRef.current = commitNotes;
  });
  useEffect(() => () => notesCommitRef.current(), []);

  return (
    <div className="p-4 pb-8 md:pb-4">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
            Item details
          </div>
          <div className="text-sm text-gray-800 break-words mt-0.5">{item.text}</div>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close item details"
          className="p-2 -mr-1 text-gray-400 hover:text-gray-700 shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <DateRow
        label="Scheduled for"
        // Never undefined: React logs an uncontrolled-to-controlled switch.
        value={item.scheduledFor ?? ''}
        onCommit={(raw) => commitDate('scheduledFor', raw)}
      />

      <DateRow
        label="Due date"
        value={item.dueDate ?? ''}
        onCommit={(raw) => commitDate('dueDate', raw)}
      />

      <div className="mb-4">
        <div className="text-xs font-medium text-gray-500 mb-1.5">Impact</div>
        <div role="radiogroup" aria-label="Impact" className="flex gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={!item.impact}
            aria-label="No impact set"
            onClick={() => commitImpact(null)}
            className={`${SEGMENT_BASE} ${
              !item.impact
                ? 'bg-gray-200 text-gray-700 border-gray-300'
                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
            }`}
          >
            —
          </button>
          {IMPACT_ORDER.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={item.impact === value}
              onClick={() => commitImpact(value)}
              className={`${SEGMENT_BASE} ${
                item.impact === value
                  ? `${IMPACT_META[value].chip} border-transparent`
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {IMPACT_META[value].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs font-medium text-gray-500 mb-1.5">Effort</div>
        <div role="radiogroup" aria-label="Effort" className="flex gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={!item.effort}
            aria-label="No effort set"
            onClick={() => commitEffort(null)}
            className={`${SEGMENT_BASE} ${
              !item.effort
                ? 'bg-gray-200 text-gray-700 border-gray-300'
                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
            }`}
          >
            —
          </button>
          {EFFORT_ORDER.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={item.effort === value}
              onClick={() => commitEffort(value)}
              className={`${SEGMENT_BASE} ${
                item.effort === value
                  ? `${EFFORT_META[value].chip} border-transparent`
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {EFFORT_META[value].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="item-detail-notes" className="block text-xs font-medium text-gray-500 mb-1.5">
          Notes
        </label>
        <textarea
          id="item-detail-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={commitNotes}
          rows={5}
          placeholder="Add notes..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 resize-y"
        />
      </div>
    </div>
  );
};

interface DateRowProps {
  label: string;
  value: string;
  onCommit: (raw: string) => void;
}

const DateRow = ({ label, value, onCommit }: DateRowProps) => (
  <div className="mb-4">
    <div className="text-xs font-medium text-gray-500 mb-1.5">{label}</div>
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={value}
        min="1900-01-01"
        max="2999-12-31"
        onChange={(e) => onCommit(e.target.value)}
        aria-label={label}
        className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400"
      />
      {/* Chrome renders a clear affordance inside the input; Safari and Firefox
          do not, so without this a mis-set date is a dead end. */}
      <button
        type="button"
        onClick={() => onCommit('')}
        disabled={value === ''}
        className="px-2 py-2 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:hover:text-gray-500"
      >
        Clear
      </button>
    </div>
  </div>
);
