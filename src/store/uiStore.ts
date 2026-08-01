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
