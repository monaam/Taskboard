import { useMemo, useState } from 'react';
import { useChecklistStore } from '../store/checklistStore';
import { useQuickAddStore } from '../store/uiStore';
import { parseQuickAdd, QuickAddParse, resolveChecklist } from '../utils/quickAdd';
import { QuickAddInput } from './QuickAddInput';

/**
 * The fast path for creating tasks, reachable from every view with N or the FAB.
 *
 * Stays open after each add and reports a running count, so capturing six
 * tasks is six lines of typing rather than six open/fill/submit cycles. Notes
 * are the one field with no token; they are added afterwards from the item
 * detail panel, which is the only other place fields can be edited.
 *
 * Must be mounted outside <Canvas />, like the other overlays: `.canvas-content`
 * carries a transform and would become the containing block for `fixed`.
 */
export const QuickAddBar = () => {
  const checklists = useChecklistStore((s) => s.checklists);
  const addItem = useChecklistStore((s) => s.addItem);
  const closeQuickAdd = useQuickAddStore((s) => s.closeQuickAdd);
  const targetChecklistId = useQuickAddStore((s) => s.targetChecklistId);
  const setTargetChecklistId = useQuickAddStore((s) => s.setTargetChecklistId);

  const [raw, setRaw] = useState('');
  const [addedCount, setAddedCount] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  // Parsed here as well as inside QuickAddInput so the target line can react to
  // a #list token as it is typed. Same pure function on the same string, so the
  // two can never disagree.
  const parse = useMemo(() => parseQuickAdd(raw), [raw]);

  // Derived, never the stored id on its own: if the selected checklist is
  // deleted while the bar is open, a stale id means a 404 on POST with nothing
  // shown to the user.
  const selected = checklists.find((c) => c.id === targetChecklistId) ?? checklists[0];
  const fromToken = resolveChecklist(checklists, parse.listQuery);
  const target = fromToken ?? selected;

  const commit = async (result: QuickAddParse) => {
    // Resolved against this parse rather than the render-time one: the two are
    // the same string today, but the add must not depend on that.
    const list = resolveChecklist(checklists, result.listQuery) ?? selected;
    if (!list) return;
    await addItem(list.id, result.text, result.fields);
    setAddedCount((n) => n + 1);
    setLastAdded(result.text);
  };

  return (
    <>
      {/* Click-anywhere-else to dismiss. Above Canvas's own z-40 dismiss
          catcher so an open context menu cannot eat the click. */}
      <div className="fixed inset-0 z-[60] bg-black/10" onClick={closeQuickAdd} />
      <div
        role="dialog"
        aria-label="Quick add task"
        className="fixed left-1/2 top-4 z-[70] w-[min(42rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl sm:top-16"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Quick add
          </span>
          <button
            type="button"
            onClick={closeQuickAdd}
            aria-label="Close quick add"
            className="p-1 text-gray-400 transition-colors hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <QuickAddInput
          onAdd={commit}
          onRawChange={setRaw}
          onEscape={closeQuickAdd}
          placeholder="e.g. call the bank tomorrow !high &quick"
          autoFocus
          showHint
          size="md"
          disabled={!target}
        />

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 pt-2.5">
          <label htmlFor="quick-add-target" className="text-xs text-gray-500">
            Add to
          </label>
          <select
            id="quick-add-target"
            value={selected?.id ?? ''}
            onChange={(e) => setTargetChecklistId(e.target.value)}
            // Disabled, not hidden, while a #list token is steering: hiding it
            // would make the override look like the setting had changed.
            disabled={!!fromToken}
            className="min-w-0 max-w-[12rem] flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
          >
            {checklists.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {fromToken && (
            <span className="text-xs text-gray-500">
              → <span className="font-medium text-gray-700">{fromToken.title}</span>
            </span>
          )}
          {/* An unmatched #name is called out rather than silently ignored. */}
          {parse.listQuery && !fromToken && (
            <span className="text-xs text-amber-600">No list matches #{parse.listQuery}</span>
          )}

          <div className="ml-auto flex items-center gap-3">
            {addedCount > 0 && (
              <span className="truncate text-xs text-green-700" aria-live="polite">
                Added {addedCount}
                {lastAdded ? ` · ${lastAdded}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
