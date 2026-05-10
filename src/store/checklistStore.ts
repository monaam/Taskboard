import { create } from 'zustand';
import { Checklist, ChecklistItem, ChecklistState, Priority, ChecklistColor } from '../types';
import { apiClient } from '../api/client';

const generateId = () => crypto.randomUUID();

// Transform API response to match our frontend types
const transformChecklist = (data: any): Checklist => ({
  id: data.id,
  title: data.title,
  x: data.x,
  y: data.y,
  color: data.color || 'default',
  order: data.order ?? 0,
  createdAt: new Date(data.createdAt).getTime(),
  updatedAt: new Date(data.updatedAt).getTime(),
  items: (data.items || []).map((item: any) => ({
    id: item.id,
    text: item.text,
    completed: item.completed,
    createdAt: new Date(item.createdAt).getTime(),
    updatedAt: new Date(item.updatedAt).getTime(),
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

  addItem: async (checklistId: string, text: string) => {
    const tempId = generateId();
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              items: [
                ...c.items,
                { id: tempId, text, completed: false, createdAt: Date.now(), updatedAt: Date.now() },
              ],
            }
          : c
      ),
    }));
    try {
      const item = await apiClient.addItem(checklistId, { text });
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
          completed: false,
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

  toggleItemComplete: async (checklistId: string, itemId: string) => {
    const state = get();
    const checklist = state.checklists.find((c) => c.id === checklistId);
    const item = checklist?.items.find((i) => i.id === itemId);
    if (!item) return;

    const completed = !item.completed;
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId ? { ...i, completed, updatedAt: Date.now() } : i
              ),
            }
          : c
      ),
    }));
    try {
      await apiClient.updateItem(checklistId, itemId, { completed });
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
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
          ? { ...c, items: c.items.filter((i) => !i.completed) }
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
          ? { ...c, items: c.items.map((i) => ({ ...i, completed: false })) }
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
          ? { ...c, items: c.items.map((i) => ({ ...i, completed: true })) }
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
          ? { ...c, items: c.items.map((i) => ({ ...i, completed: false })) }
          : c
      ),
    }));
    try {
      await apiClient.deselectAll(checklistId);
    } catch (error) {
      console.error('Failed to deselect all:', error);
    }
  },

  // Optional features (not synced to backend for now)
  addSubItem: (checklistId: string, parentId: string, text: string) => {
    const newSubItem: ChecklistItem = {
      id: generateId(),
      text,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      checklists: state.checklists.map((c) => {
        if (c.id !== checklistId) return c;
        return {
          ...c,
          items: c.items.map((item) =>
            item.id === parentId
              ? { ...item, subItems: [...(item.subItems || []), newSubItem] }
              : item
          ),
        };
      }),
    }));
  },

  setItemDueDate: (checklistId: string, itemId: string, dueDate: number | undefined) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId ? { ...i, dueDate } : i
              ),
            }
          : c
      ),
    }));
  },

  setItemNotes: (checklistId: string, itemId: string, notes: string) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId ? { ...i, notes } : i
              ),
            }
          : c
      ),
    }));
  },

  setItemPriority: (checklistId: string, itemId: string, priority: Priority | undefined) => {
    set((state) => ({
      checklists: state.checklists.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId ? { ...i, priority } : i
              ),
            }
          : c
      ),
    }));
  },
}));
