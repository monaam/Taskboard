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
import { SlideOverPanel } from './SlideOverPanel';
import { ChoiceRow, DateRow, NotesField } from './ItemFieldRows';

/**
 * Must be mounted OUTSIDE <Canvas />: see SlideOverPanel for why.
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

  // The open item can vanish under us: deleteItem, deleteAllCompleted,
  // deleteChecklist, or handleSave deleting a blank row.
  useEffect(() => {
    if (openItemId && !found) closeItemDetail();
  }, [openItemId, found, closeItemDetail]);

  if (!openItemId || !found) return null;

  return (
    <SlideOverPanel ariaLabel="Item details" onClose={closeItemDetail}>
      {/* Key the CONTENT, not the shell: insertItemAfter/addItem swap the temp
          id for the server id once the POST resolves, and remounting the shell
          mid-edit would discard typed notes. */}
      <ItemDetailContent
        key={found.item.id}
        item={found.item}
        checklistId={found.checklistId}
        onClose={closeItemDetail}
      />
    </SlideOverPanel>
  );
};

type DateField = 'scheduledFor' | 'dueDate';

interface ItemDetailContentProps {
  item: ChecklistItem;
  checklistId: string;
  onClose: () => void;
}

const ItemDetailContent = ({ item, checklistId, onClose }: ItemDetailContentProps) => {
  const updateItemFields = useChecklistStore((s) => s.updateItemFields);

  const [notes, setNotes] = useState(item.notes ?? '');

  // Mount-only: this component is keyed by item id, so switching items
  // remounts it and re-runs the focus, exactly as the old [foundItemId]
  // dependency did.
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

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

      <ChoiceRow
        label="Impact"
        options={IMPACT_ORDER}
        meta={IMPACT_META}
        value={item.impact ?? null}
        onChange={commitImpact}
      />

      <ChoiceRow
        label="Effort"
        options={EFFORT_ORDER}
        meta={EFFORT_META}
        value={item.effort ?? null}
        onChange={commitEffort}
      />

      <NotesField value={notes} onChange={setNotes} onBlur={commitNotes} />
    </div>
  );
};
