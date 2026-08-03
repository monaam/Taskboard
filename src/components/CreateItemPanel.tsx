import { useEffect, useRef, useState } from 'react';
import { EFFORT_META, EFFORT_ORDER, IMPACT_META, IMPACT_ORDER } from '../types';
import { useChecklistStore } from '../store/checklistStore';
import { useCreateItemStore } from '../store/uiStore';
import { SlideOverPanel } from './SlideOverPanel';
import { ChoiceRow, DateRow, NotesField } from './ItemFieldRows';

interface CreateItemPanelProps {
  // Focus goes back to whatever opened the panel; the FAB is the only opener
  // today, but the panel should not have to know that.
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export const CreateItemPanel = ({ returnFocusRef }: CreateItemPanelProps) => {
  const checklists = useChecklistStore((s) => s.checklists);
  const addItem = useChecklistStore((s) => s.addItem);
  // `draft` is a stored reference, not an object rebuilt per selector call, so
  // selecting it whole does not make useSyncExternalStore loop.
  const draft = useCreateItemStore((s) => s.draft);
  const setDraft = useCreateItemStore((s) => s.setDraft);
  const resetDraft = useCreateItemStore((s) => s.resetDraft);
  const closeCreateItem = useCreateItemStore((s) => s.closeCreateItem);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const textRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textRef.current?.focus();
  }, []);

  // Derived, never the stored id on its own: if the selected checklist is
  // deleted while the panel is open, a stale id produces no optimistic row and
  // a 404 on POST, with nothing shown to the user.
  const target = checklists.find((c) => c.id === draft.checklistId) ?? checklists[0];

  const canSubmit = draft.text.trim() !== '' && !!target && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      // Normalize before sending: the inputs produce '' when untouched, and
      // the server rejects '' — it is neither undefined nor null and fails
      // DATE_RE. Mirrors commitDate/commitNotes in ItemDetailPanel.
      await addItem(target.id, draft.text.trim(), {
        scheduledFor: draft.scheduledFor === '' ? null : draft.scheduledFor,
        dueDate: draft.dueDate === '' ? null : draft.dueDate,
        impact: draft.impact,
        effort: draft.effort,
        notes: draft.notes.trim() === '' ? null : draft.notes,
      });
      // Only a successful submit clears the draft.
      resetDraft();
      closeCreateItem();
      returnFocusRef?.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SlideOverPanel ariaLabel="New task" onClose={closeCreateItem}>
      <form onSubmit={handleSubmit} className="p-4 pb-8 md:pb-4">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
            New task
          </div>
          <button
            type="button"
            onClick={closeCreateItem}
            aria-label="Close new task"
            className="p-2 -mr-1 -mt-1.5 text-gray-400 hover:text-gray-700 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <label htmlFor="create-item-text" className="block text-xs font-medium text-gray-500 mb-1.5">
            Task
          </label>
          {/* A textarea, not an input: item text wraps everywhere it is shown. */}
          <textarea
            id="create-item-text"
            ref={textRef}
            value={draft.text}
            onChange={(e) => setDraft({ text: e.target.value })}
            rows={2}
            placeholder="What needs doing?"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 resize-y"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="create-item-checklist" className="block text-xs font-medium text-gray-500 mb-1.5">
            Add to
          </label>
          <select
            id="create-item-checklist"
            value={target?.id ?? ''}
            onChange={(e) => setDraft({ checklistId: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 bg-white"
          >
            {checklists.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <DateRow
          label="Scheduled for"
          value={draft.scheduledFor}
          onCommit={(raw) => setDraft({ scheduledFor: raw })}
        />

        <DateRow
          label="Due date"
          value={draft.dueDate}
          onCommit={(raw) => setDraft({ dueDate: raw })}
        />

        <ChoiceRow
          label="Impact"
          options={IMPACT_ORDER}
          meta={IMPACT_META}
          value={draft.impact}
          onChange={(impact) => setDraft({ impact })}
        />

        <ChoiceRow
          label="Effort"
          options={EFFORT_ORDER}
          meta={EFFORT_META}
          value={draft.effort}
          onChange={(effort) => setDraft({ effort })}
        />

        <NotesField value={draft.notes} onChange={(notes) => setDraft({ notes })} rows={3} />

        {/* Same predicate as isEligible, so a created task can never be
            invisible in the very views this form is opened from. */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-4 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
        >
          Add task
        </button>
      </form>
    </SlideOverPanel>
  );
};
