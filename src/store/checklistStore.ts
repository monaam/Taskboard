import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Checklist, ChecklistItem, ChecklistState, Priority } from '../types';

const generateId = () => crypto.randomUUID();

export const useChecklistStore = create<ChecklistState>()(
  persist(
    (set) => ({
      checklist: null,

      // Checklist actions
      createChecklist: (title: string) =>
        set({
          checklist: {
            id: generateId(),
            title,
            items: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }),

      updateChecklistTitle: (title: string) =>
        set((state) => {
          if (!state.checklist) return state;
          return {
            checklist: {
              ...state.checklist,
              title,
              updatedAt: Date.now(),
            },
          };
        }),

      deleteChecklist: () => set({ checklist: null }),

      // Item actions
      addItem: (text: string) =>
        set((state) => {
          if (!state.checklist) return state;
          const newItem: ChecklistItem = {
            id: generateId(),
            text,
            completed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return {
            checklist: {
              ...state.checklist,
              items: [...state.checklist.items, newItem],
              updatedAt: Date.now(),
            },
          };
        }),

      deleteItem: (itemId: string) =>
        set((state) => {
          if (!state.checklist) return state;
          return {
            checklist: {
              ...state.checklist,
              items: state.checklist.items.filter((item) => item.id !== itemId),
              updatedAt: Date.now(),
            },
          };
        }),

      updateItemText: (itemId: string, text: string) =>
        set((state) => {
          if (!state.checklist) return state;
          return {
            checklist: {
              ...state.checklist,
              items: state.checklist.items.map((item) =>
                item.id === itemId
                  ? { ...item, text, updatedAt: Date.now() }
                  : item
              ),
              updatedAt: Date.now(),
            },
          };
        }),

      toggleItemComplete: (itemId: string) =>
        set((state) => {
          if (!state.checklist) return state;
          return {
            checklist: {
              ...state.checklist,
              items: state.checklist.items.map((item) =>
                item.id === itemId
                  ? { ...item, completed: !item.completed, updatedAt: Date.now() }
                  : item
              ),
              updatedAt: Date.now(),
            },
          };
        }),

      reorderItems: (startIndex: number, endIndex: number) =>
        set((state) => {
          if (!state.checklist) return state;
          const items = Array.from(state.checklist.items);
          const [removed] = items.splice(startIndex, 1);
          items.splice(endIndex, 0, removed);
          return {
            checklist: {
              ...state.checklist,
              items,
              updatedAt: Date.now(),
            },
          };
        }),

      // Bulk actions
      deleteAllCompleted: () =>
        set((state) => {
          if (!state.checklist) return state;
          return {
            checklist: {
              ...state.checklist,
              items: state.checklist.items.filter((item) => !item.completed),
              updatedAt: Date.now(),
            },
          };
        }),

      uncheckAll: () =>
        set((state) => {
          if (!state.checklist) return state;
          return {
            checklist: {
              ...state.checklist,
              items: state.checklist.items.map((item) => ({
                ...item,
                completed: false,
                updatedAt: Date.now(),
              })),
              updatedAt: Date.now(),
            },
          };
        }),

      selectAll: () =>
        set((state) => {
          if (!state.checklist) return state;
          return {
            checklist: {
              ...state.checklist,
              items: state.checklist.items.map((item) => ({
                ...item,
                completed: true,
                updatedAt: Date.now(),
              })),
              updatedAt: Date.now(),
            },
          };
        }),

      deselectAll: () =>
        set((state) => {
          if (!state.checklist) return state;
          return {
            checklist: {
              ...state.checklist,
              items: state.checklist.items.map((item) => ({
                ...item,
                completed: false,
                updatedAt: Date.now(),
              })),
              updatedAt: Date.now(),
            },
          };
        }),

      // Optional item features
      addSubItem: (parentId: string, text: string) =>
        set((state) => {
          if (!state.checklist) return state;
          const newSubItem: ChecklistItem = {
            id: generateId(),
            text,
            completed: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return {
            checklist: {
              ...state.checklist,
              items: state.checklist.items.map((item) =>
                item.id === parentId
                  ? {
                      ...item,
                      subItems: [...(item.subItems || []), newSubItem],
                      updatedAt: Date.now(),
                    }
                  : item
              ),
              updatedAt: Date.now(),
            },
          };
        }),

      setItemDueDate: (itemId: string, dueDate: number | undefined) =>
        set((state) => {
          if (!state.checklist) return state;
          return {
            checklist: {
              ...state.checklist,
              items: state.checklist.items.map((item) =>
                item.id === itemId
                  ? { ...item, dueDate, updatedAt: Date.now() }
                  : item
              ),
              updatedAt: Date.now(),
            },
          };
        }),

      setItemNotes: (itemId: string, notes: string) =>
        set((state) => {
          if (!state.checklist) return state;
          return {
            checklist: {
              ...state.checklist,
              items: state.checklist.items.map((item) =>
                item.id === itemId
                  ? { ...item, notes, updatedAt: Date.now() }
                  : item
              ),
              updatedAt: Date.now(),
            },
          };
        }),

      setItemPriority: (itemId: string, priority: Priority | undefined) =>
        set((state) => {
          if (!state.checklist) return state;
          return {
            checklist: {
              ...state.checklist,
              items: state.checklist.items.map((item) =>
                item.id === itemId
                  ? { ...item, priority, updatedAt: Date.now() }
                  : item
              ),
              updatedAt: Date.now(),
            },
          };
        }),
    }),
    {
      name: 'checklist-storage',
    }
  )
);
