import { useCallback, useEffect, useRef, useState } from 'react';
import { useChecklistStore } from '../store/checklistStore';
import { UndoCompletion, useUndoStore } from '../store/uiStore';

/**
 * "Completed 'X' — Undo", bottom-centre, for ~6 seconds.
 *
 * Raised by toggleItemComplete in checklistStore, so it covers every surface
 * that ticks a box: the board, TriageRow and ScheduleRow. The two list views
 * drop completed items outright (isEligible), and the board hides them whenever
 * "Hide Completed" is on — in all three the row is simply gone, and this is the
 * only way back.
 */

// Kept local: react-refresh/only-export-components is an error in this config,
// and a non-component export sitting beside a component export trips it.
const UNDO_MS = 6000;

export const UndoToast = () => {
  const undo = useUndoStore((s) => s.undo);

  // The lane is mounted unconditionally and stands empty between toasts.
  // Screen readers only announce mutations to a live region that was already in
  // the accessibility tree, so a role="status" that mounts together with its
  // text is routinely dropped — it would fail on the first completion after
  // page load, which is the one that matters most.
  //
  // pointer-events-none is load-bearing: this is a permanently-mounted
  // full-width fixed strip, and without it every click aimed at the FAB or the
  // canvas underneath would land here instead. The card re-enables them.
  //
  // z-[55] clears the whole z-50 tier (user menu, Canvas's mobile FAB and its
  // Auto-arrange pill, the context menu) and stays under SlideOverPanel's
  // z-[60]/z-[70] so an open drawer still dims it. Accepted trade: at z-[55]
  // the toast sits outside Canvas's `fixed inset-0 z-40` context-menu catcher,
  // so clicking Undo will not also dismiss an open context menu. App's FAB
  // declined exactly this trade by sitting at z-30; the toast cannot, because
  // an Undo you can't click is worse than no Undo at all.
  //
  // pr-24 reserves the ~80px column the App FAB occupies in the same vertical
  // band on phones; above sm there is room to centre properly.
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[55] flex justify-center pb-6 pl-4 pr-24 sm:pr-4"
    >
      {/* Keyed on the monotonic id, not the item id: completing the same item
          twice in a row must remount the card and re-arm the countdown. */}
      {undo && <UndoCard key={undo.id} undo={undo} />}
    </div>
  );
};

const UndoCard = ({ undo }: { undo: UndoCompletion }) => {
  const { id, itemId, text } = undo;
  const clearUndo = useUndoStore((s) => s.clearUndo);

  // Two flags, not one. With a single "paused" boolean, moving the mouse away
  // from a toast whose Undo button still holds keyboard focus would resume the
  // countdown under the user's hand.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  const remainingRef = useRef(UNDO_MS);

  // Is the completion this toast describes still the truth? One check covers
  // deletion of the item, "Delete Completed", "Deselect All", a manual re-tick,
  // and the temp-id → server-id swap on a brand-new row.
  const isLive = useChecklistStore((s) =>
    s.checklists.some((c) => c.items.some((i) => i.id === itemId && i.completed))
  );

  useEffect(() => {
    if (paused) return;

    // A closure local, never a ref. StrictMode is on, so React runs
    // effect → cleanup → effect on mount; a deadline stored in a ref would be
    // written by the first run and read by the second. Making cleanup the sole
    // writer of remainingRef makes the double invocation exactly idempotent —
    // it debits ~0ms and re-arms.
    const startedAt = Date.now();
    const timer = setTimeout(() => clearUndo(id), remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt));
    };
  }, [paused, id, clearUndo]);

  const handleUndo = useCallback(() => {
    // Resolve the owning checklist now rather than storing it with the toast.
    // The item may have been dragged to another list inside the 6s window, and
    // the server's PATCH route checks only that the *checklist* is yours — a
    // stale pair would succeed on the wire while the optimistic update, which
    // matches on checklist id, missed entirely.
    const owner = useChecklistStore
      .getState()
      .checklists.find((c) => c.items.some((i) => i.id === itemId));
    // No owner = the checklist was deleted. Dismiss and do nothing; never fall
    // back to matching on text.
    if (owner) {
      useChecklistStore.getState().setItemCompleted(owner.id, itemId, false);
    }
    clearUndo(id);
  }, [id, itemId, clearUndo]);

  // After the hooks, never before. Returning null rather than dismissing
  // imperatively keeps store writes out of the render path; the timer above is
  // still running and clears the slot on schedule.
  if (!isLive) return null;

  return (
    // max-w-sm below lg is arithmetic, not taste: Canvas's Auto-arrange pill
    // spans x∈[24,174] and only exists above 768px, where a centred 384px card
    // starts at 192 — clear by 18px. A 448px card would start at 160 and clip
    // it.
    //
    // Pause on pointer events with a mouse guard rather than onMouseEnter: iOS
    // Safari synthesizes mouseenter on tap and then withholds mouseleave, which
    // would pause the countdown forever on a touch device.
    <div
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerCancel={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 shadow-lg lg:max-w-md"
    >
      <p className="min-w-0 flex-1 truncate text-sm text-white">
        Completed “{text}”
      </p>
      {/* Never autofocused — the toast must not steal focus from whatever the
          user is typing in. */}
      <button
        type="button"
        onClick={handleUndo}
        className="shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-blue-300 transition-colors hover:bg-white/10 hover:text-blue-200"
      >
        Undo
      </button>
    </div>
  );
};
