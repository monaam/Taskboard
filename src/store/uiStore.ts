import { create } from 'zustand';

// Ephemeral UI state, deliberately kept out of checklistStore so it never
// touches the persistence surface.
type ItemDetailState = {
  // Item id alone, never a {checklistId, itemId} pair: moveItemBetweenChecklists
  // keeps the item id and changes its parent, so a stored pair would go stale
  // the moment the open item is dragged to another list.
  openItemId: string | null;
  openItemDetail: (itemId: string) => void;
  closeItemDetail: () => void;
};

export const useItemDetailStore = create<ItemDetailState>()((set) => ({
  openItemId: null,
  // The two overlays are mutually exclusive: both are `fixed`, so two open at
  // once would simply stack on each other.
  openItemDetail: (itemId: string) => {
    useQuickAddStore.getState().closeQuickAdd();
    set({ openItemId: itemId });
  },
  closeItemDetail: () => set({ openItemId: null }),
}));

type QuickAddState = {
  isOpen: boolean;
  // Which checklist the bar is pointed at. Lives here rather than in the
  // component so the choice survives closing and reopening the bar — picking
  // the list again on every open is exactly the friction the bar exists to
  // remove. null means "the first checklist", resolved at render time so a
  // deleted list cannot leave a stale id behind.
  targetChecklistId: string | null;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  setTargetChecklistId: (id: string | null) => void;
};

// The only way to create a task, and mutually exclusive with the detail panel
// for the same reason given there.
export const useQuickAddStore = create<QuickAddState>()((set) => ({
  isOpen: false,
  targetChecklistId: null,
  openQuickAdd: () => {
    useItemDetailStore.getState().closeItemDetail();
    set({ isOpen: true });
  },
  closeQuickAdd: () => set({ isOpen: false }),
  setTargetChecklistId: (targetChecklistId) => set({ targetChecklistId }),
}));

type GuideState = {
  isOpen: boolean;
  openGuide: () => void;
  closeGuide: () => void;
};

// The guide is the one genuinely modal overlay — it covers the screen and is
// read, not worked alongside — so it closes the other two on open rather than
// the other way round.
export const useGuideStore = create<GuideState>()((set) => ({
  isOpen: false,
  openGuide: () => {
    useItemDetailStore.getState().closeItemDetail();
    useQuickAddStore.getState().closeQuickAdd();
    set({ isOpen: true });
  },
  closeGuide: () => set({ isOpen: false }),
}));

export type AppView = 'board' | 'priority' | 'schedule';

// Same localStorage convention as taskManager_zoom / taskManager_pan.
const VIEW_KEY = 'taskManager_view';

// A membership check rather than a chain of ternaries — it stays one line per
// new view instead of one nested branch, and still degrades anything unknown
// (or absent, or garbage left by an older build) to 'board'.
const STORED_VIEWS: AppView[] = ['priority', 'schedule'];

const readStoredView = (): AppView => {
  const stored = localStorage.getItem(VIEW_KEY);
  return STORED_VIEWS.find((v) => v === stored) ?? 'board';
};

// A store rather than useState in AppContent because the priority view's empty
// state needs a "Go to the board" button, and prop-drilling a setter through it
// buys nothing.
export const useViewStore = create<{ view: AppView; setView: (v: AppView) => void }>()((set) => ({
  view: readStoredView(),
  // Written in the setter, not an effect: an effect fires on mount and rewrites
  // the value it just read, and costs an extra render per switch.
  setView: (view) => {
    localStorage.setItem(VIEW_KEY, view);
    set({ view });
  },
}));

export type UndoCompletion = {
  // Monotonic, and the React key of the card: the item id alone would not
  // re-arm the countdown when the same item is completed twice in a row.
  id: number;
  // Item id alone, never a {checklistId, itemId} pair — see the note on
  // useItemDetailStore above, and the server's id-only PATCH. Owner is
  // resolved at undo time.
  itemId: string;
  text: string;
};

let nextUndoId = 1;

type UndoState = {
  undo: UndoCompletion | null;
  showUndo: (itemId: string, text: string) => void;
  clearUndo: (id: number) => void;
};

// One slot, not a queue — a stack of these is a notification centre, which this
// is not. A second completion replaces the first outright.
export const useUndoStore = create<UndoState>()((set) => ({
  undo: null,
  showUndo: (itemId, text) => set({ undo: { id: nextUndoId++, itemId, text } }),
  // Takes the id and no-ops unless it matches, so a timer left over from a
  // dismissed toast can never clear the one that replaced it.
  clearUndo: (id) => set((s) => (s.undo?.id === id ? { undo: null } : s)),
}));
