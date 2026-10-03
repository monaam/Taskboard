import { create } from 'zustand';
import { Checklist, ChecklistState, ChecklistColor, ItemFields, ItemStatus } from '../types';
import { apiClient } from '../api/client';
// One-way edge, and it has to stay that way: uiStore imports only zustand and
// ../types, and must never import this file. Reaching across stores with
// getState() is the existing house pattern (see uiStore's two panel stores).
import { useUndoStore } from './uiStore';

const generateId = () => crypto.randomUUID();

// Transform API response to match our frontend types
const transformChecklist = (data: any): Checklist => ({
  id: data.id,
  title: data.title,
  // Defaulted so a response from an older server still yields a usable object
  // rather than an undefined that renders as a missing badge.
  isOwner: data.isOwner ?? true,
  owner: data.owner ?? { id: '', username: '' },
  members: data.members ?? [],
  x: data.x,
  y: data.y,
  color: data.color || 'default',
  order: data.order ?? 0,
  createdAt: new Date(data.createdAt).getTime(),
  updatedAt: new Date(data.updatedAt).getTime(),
  items: (data.items || []).map((item: any) => ({
    id: item.id,
    text: item.text,
    status: item.status ?? 'todo',
    createdAt: new Date(item.createdAt).getTime(),
    updatedAt: new Date(item.updatedAt).getTime(),
    // Dates stay as 'YYYY-MM-DD' strings — no conversion
    scheduledFor: item.scheduledFor ?? null,
    dueDate: item.dueDate ?? null,
    impact: item.impact ?? null,
    effort: item.effort ?? null,
    notes: item.notes ?? null,
  })),
});

export const useChecklistStore = create<ChecklistState & {
  loadChecklists: () => Promise<void>;
  isLoaded: boolean;
}>()((set, get) => ({
  checklists: [],
  isLoaded: false,

  loadChecklists: async () => {
    try {
      const data = await apiClient.getChecklists();
      set({ checklists: data.map(transformChecklist), isLoaded: true });
    } catch (error) {
      console.error('Failed to load checklists:', error);
      set({ isLoaded: true });
    }
  },

  createChecklist: async (title: string, x?: number, y?: number) => {
    const position = { x: x ?? 100, y: y ?? 100 };

    try {
      const data = await apiClient.createChecklist({ title, ...position });
      const checklist = transformChecklist(data);
      set((state) => ({ checklists: [...state.checklists, checklist] }));
    } catch (error) {
      console.error('Failed to create checklist:', error);
    }
  },

  updateChecklistTitle: async (checklistId: string, title: string) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId ? { ...c, title, updatedAt: Date.now() } : c
      ),
    }));
    try {
      await apiClient.updateChecklist(checklistId, { title });
    } catch (error) {
      console.error('Failed to update checklist title:', error);
    }
  },

  updateChecklistPosition: async (checklistId: string, x: number, y: number) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId ? { ...c, x, y, updatedAt: Date.now() } : c
      ),
    }));
    // Debounce position updates to avoid too many API calls
    try {
      await apiClient.updateChecklist(checklistId, { x, y });
    } catch (error) {
      console.error('Failed to update checklist position:', error);
    }
  },

  updateChecklistColor: async (checklistId: string, color: ChecklistColor) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId ? { ...c, color, updatedAt: Date.now() } : c
      ),
    }));
    try {
      await apiClient.updateChecklist(checklistId, { color });
    } catch (error) {
      console.error('Failed to update checklist color:', error);
    }
  },

  deleteChecklist: async (checklistId: string) => {
    set((state) => ({
      checklists: state.checklists.filter((c) => c.id !== checklistId),
    }));
    try {
      await apiClient.deleteChecklist(checklistId);
    } catch (error) {
      console.error('Failed to delete checklist:', error);
    }
  },

  shareChecklist: async (checklistId: string, username: string) => {
    try {
      await apiClient.addShare(checklistId, username);
      // Reload rather than patch: the server owns the member list, and a
      // guessed local shape would drift from it.
      await get().loadChecklists();
      return null;
    } catch (error) {
      // The message is the point here — "no account called X" is the whole
      // feedback the share form has to offer.
      return error instanceof Error ? error.message : 'Could not share this list';
    }
  },

  removeMember: async (checklistId: string, userId: string) => {
    try {
      await apiClient.removeShare(checklistId, userId);
      await get().loadChecklists();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  },

  leaveChecklist: async (checklistId: string) => {
    // Optimistic: the card should go the moment it is clicked, like a delete.
    set((state) => ({ checklists: state.checklists.filter((c) => c.id !== checklistId) }));
    try {
      await apiClient.leaveShare(checklistId);
    } catch (error) {
      console.error('Failed to leave checklist:', error);
      await get().loadChecklists();
    }
  },

  addItem: async (checklistId: string, text: string, fields?: ItemFields) => {
    const tempId = generateId();
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              items: [
                ...c.items,
                {
                  id: tempId,
                  text,
                  status: 'todo' as const,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  ...fields,
                },
              ],
            }
          : c
      ),
    }));
    try {
      const item = await apiClient.addItem(checklistId, { text, ...fields });
      // Update with real ID
      set((state) => ({
        checklists: state.checklists.map((c) =>
          c.id === checklistId
            ? {
                ...c,
                items: c.items.map((i) =>
                  i.id === tempId ? { ...i, id: item.id } : i
                ),
              }
            : c
        ),
      }));
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  },

  insertItemAfter: (checklistId: string, afterItemId: string) => {
    const newItemId = generateId();
    set((state) => ({
      checklists: state.checklists.map((c) => {
        if (c.id !== checklistId) return c;
        const itemIndex = c.items.findIndex((i) => i.id === afterItemId);
        if (itemIndex === -1) return c;
        const newItems = [...c.items];
        newItems.splice(itemIndex + 1, 0, {
          id: newItemId,
          text: '',
          status: 'todo' as const,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return { ...c, items: newItems };
      }),
    }));

    // Sync with backend
    apiClient.addItem(checklistId, { text: '', afterItemId }).then((item) => {
      set((state) => ({
        checklists: state.checklists.map((c) =>
          c.id === checklistId
            ? {
                ...c,
                items: c.items.map((i) =>
                  i.id === newItemId ? { ...i, id: item.id } : i
                ),
              }
            : c
        ),
      }));
    }).catch(console.error);

    return newItemId;
  },

  deleteItem: async (checklistId: string, itemId: string) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
          : c
      ),
    }));
    try {
      await apiClient.deleteItem(checklistId, itemId);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  },

  updateItemText: async (checklistId: string, itemId: string, text: string) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId ? { ...i, text, updatedAt: Date.now() } : i
              ),
            }
          : c
      ),
    }));
    try {
      await apiClient.updateItem(checklistId, itemId, { text });
    } catch (error) {
      console.error('Failed to update item text:', error);
    }
  },

  // Absolute, and silent. Undo calls this one so that undoing a completion
  // cannot raise a second toast. Split in this direction only: if the toast
  // lived here instead, every undo would announce itself.
  setItemStatus: async (checklistId: string, itemId: string, status: ItemStatus) => {
    const checklist = get().checklists.find((c) => c.id === checklistId);
    const item = checklist?.items.find((i) => i.id === itemId);
    // Missing = deleted while the toast was up. Already in the target state =
    // nothing to do; the early return is what makes undo idempotent and drops
    // a duplicate PATCH.
    if (!item || item.status === status) return;

    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId ? { ...i, status, updatedAt: Date.now() } : i
              ),
            }
          : c
      ),
    }));
    try {
      await apiClient.updateItem(checklistId, itemId, { status });
    } catch (error) {
      console.error('Failed to set item status:', error);
    }
  },

  // The row path — what the status toggle calls. setItemStatus is the silent
  // primitive underneath; this is the wrapper that announces a completion.
  //
  // Bulk operations (selectAll, deselectAll, uncheckAll, deleteAllCompleted)
  // deliberately do not route through here: they write `status` through their
  // own set(), so they raise no toasts. That is correct, not an oversight — a
  // single-item undo payload cannot represent forty rows.
  chooseItemStatus: async (checklistId: string, itemId: string, status: ItemStatus) => {
    const checklist = get().checklists.find((c) => c.id === checklistId);
    const item = checklist?.items.find((i) => i.id === itemId);
    if (!item || item.status === status) return;

    const written = get().setItemStatus(checklistId, itemId, status);

    // Raised off the optimistic write rather than the round trip: setItemStatus
    // updates the store synchronously and only then PATCHes, and it swallows
    // its own errors, so awaiting first would delay the toast — and with it the
    // 6s window — by the network latency and buy nothing.
    //
    // Only on arriving at 'done'. The other two segments are one click from
    // being reversed and are visible on the row, so a toast for them is noise.
    if (status === 'done') {
      useUndoStore.getState().showUndo(itemId, item.text);
    }
    await written;
  },

  reorderItems: async (checklistId: string, startIndex: number, endIndex: number) => {
    set((state) => ({
      checklists: state.checklists.map((c) => {
        if (c.id !== checklistId) return c;
        const items = Array.from(c.items);
        const [removed] = items.splice(startIndex, 1);
        items.splice(endIndex, 0, removed);
        return { ...c, items };
      }),
    }));

    const state = get();
    const checklist = state.checklists.find((c) => c.id === checklistId);
    if (checklist) {
      try {
        await apiClient.reorderItems(checklistId, checklist.items.map((i) => i.id));
      } catch (error) {
        console.error('Failed to reorder items:', error);
      }
    }
  },

  reorderChecklists: async (startIndex: number, endIndex: number) => {
    set((state) => {
      const checklists = Array.from(state.checklists);
      const [removed] = checklists.splice(startIndex, 1);
      checklists.splice(endIndex, 0, removed);
      return { checklists };
    });

    const state = get();
    try {
      await apiClient.reorderChecklists(state.checklists.map((c) => c.id));
    } catch (error) {
      console.error('Failed to reorder checklists:', error);
    }
  },

  arrangeChecklists: async (positions: { id: string; x: number; y: number }[]) => {
    if (positions.length === 0) return;

    // One set() for the whole board, not N calls to updateChecklistPosition:
    // Canvas, Checklist and ChecklistHeader all subscribe to the entire store,
    // so N notifications would be N full board re-renders.
    const byId = new Map(positions.map((p) => [p.id, p]));
    set((state) => ({
      checklists: state.checklists.map((c) => {
        const next = byId.get(c.id);
        return next ? { ...c, x: next.x, y: next.y, updatedAt: Date.now() } : c;
      }),
    }));

    try {
      await apiClient.setChecklistPositions(positions);
    } catch (error) {
      console.error('Failed to arrange checklists:', error);
    }
  },

  moveItemBetweenChecklists: async (
    sourceChecklistId: string,
    targetChecklistId: string,
    itemId: string,
    targetIndex: number
  ) => {
    const state = get();
    const sourceChecklist = state.checklists.find((c) => c.id === sourceChecklistId);
    const item = sourceChecklist?.items.find((i) => i.id === itemId);
    if (!item) return;

    set((state) => ({
      checklists: state.checklists.map((c) => {
        if (c.id === sourceChecklistId) {
          return { ...c, items: c.items.filter((i) => i.id !== itemId) };
        }
        if (c.id === targetChecklistId) {
          const newItems = [...c.items];
          newItems.splice(targetIndex, 0, { ...item, updatedAt: Date.now() });
          return { ...c, items: newItems };
        }
        return c;
      }),
    }));

    try {
      await apiClient.moveItemBetweenChecklists(sourceChecklistId, targetChecklistId, itemId, targetIndex);
    } catch (error) {
      console.error('Failed to move item:', error);
    }
  },

  deleteAllCompleted: async (checklistId: string) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? { ...c, items: c.items.filter((i) => i.status !== 'done') }
          : c
      ),
    }));
    try {
      await apiClient.deleteCompleted(checklistId);
    } catch (error) {
      console.error('Failed to delete completed:', error);
    }
  },

  uncheckAll: async (checklistId: string) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? { ...c, items: c.items.map((i) => ({ ...i, status: 'todo' as const })) }
          : c
      ),
    }));
    try {
      await apiClient.deselectAll(checklistId);
    } catch (error) {
      console.error('Failed to uncheck all:', error);
    }
  },

  selectAll: async (checklistId: string) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? { ...c, items: c.items.map((i) => ({ ...i, status: 'done' as const })) }
          : c
      ),
    }));
    try {
      await apiClient.selectAll(checklistId);
    } catch (error) {
      console.error('Failed to select all:', error);
    }
  },

  deselectAll: async (checklistId: string) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.status === 'done' ? { ...i, status: 'todo' as const } : i
              ),
            }
          : c
      ),
    }));
    try {
      await apiClient.deselectAll(checklistId);
    } catch (error) {
      console.error('Failed to deselect all:', error);
    }
  },

  updateItemFields: async (checklistId: string, itemId: string, fields: ItemFields) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId ? { ...i, ...fields, updatedAt: Date.now() } : i
              ),
            }
          : c
      ),
    }));
    try {
      await apiClient.updateItem(checklistId, itemId, fields);
    } catch (error) {
      console.error('Failed to update item fields:', error);
    }
  },
}));
