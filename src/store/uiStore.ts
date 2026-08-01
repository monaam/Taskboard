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
  openItemDetail: (itemId: string) => set({ openItemId: itemId }),
  closeItemDetail: () => set({ openItemId: null }),
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
