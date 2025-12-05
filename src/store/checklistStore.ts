import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Checklist, ChecklistItem, ChecklistState, Priority } from '../types';

const generateId = () => crypto.randomUUID();

// Random position generator for new checklists
// Place them in the visible area (top-left quadrant) with some randomness
const getRandomPosition = () => {
  const visibleWidth = 1200;
  const visibleHeight = 800;
  const margin = 50;

  return {
    x: margin + Math.random() * (visibleWidth - margin * 2),
    y: margin + Math.random() * (visibleHeight - margin * 2),
  };
};

export const useChecklistStore = create<ChecklistState>()(
  persist(
    (set) => ({
      checklists: [],

      // Checklist actions
      createChecklist: (title: string, x?: number, y?: number) => {
        const position = x !== undefined && y !== undefined
          ? { x, y }
          : getRandomPosition();

        set((state) => ({
          checklists: [
            ...state.checklists,
            {
              id: generateId(),
              title,
              items: [],
              x: position.x,
              y: position.y,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        }));
      },

      updateChecklistTitle: (checklistId: string, title: string) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? { ...checklist, title, updatedAt: Date.now() }
              : checklist
          ),
        })),

      updateChecklistPosition: (checklistId: string, x: number, y: number) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? { ...checklist, x, y, updatedAt: Date.now() }
              : checklist
          ),
        })),

      deleteChecklist: (checklistId: string) =>
        set((state) => ({
          checklists: state.checklists.filter((c) => c.id !== checklistId),
        })),

      // Item actions
      addItem: (checklistId: string, text: string) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: [
                    ...checklist.items,
                    {
                      id: generateId(),
                      text,
                      completed: false,
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    },
                  ],
                  updatedAt: Date.now(),
                }
              : checklist
          ),
        })),

      deleteItem: (checklistId: string, itemId: string) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: checklist.items.filter((item) => item.id !== itemId),
                  updatedAt: Date.now(),
                }
              : checklist
          ),
        })),

      updateItemText: (checklistId: string, itemId: string, text: string) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: checklist.items.map((item) =>
                    item.id === itemId
                      ? { ...item, text, updatedAt: Date.now() }
                      : item
                  ),
                  updatedAt: Date.now(),
                }
              : checklist
          ),
        })),

      toggleItemComplete: (checklistId: string, itemId: string) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: checklist.items.map((item) =>
                    item.id === itemId
                      ? { ...item, completed: !item.completed, updatedAt: Date.now() }
                      : item
                  ),
                  updatedAt: Date.now(),
                }
              : checklist
          ),
        })),

      reorderItems: (checklistId: string, startIndex: number, endIndex: number) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) => {
            if (checklist.id !== checklistId) return checklist;

            const items = Array.from(checklist.items);
            const [removed] = items.splice(startIndex, 1);
            items.splice(endIndex, 0, removed);

            return {
              ...checklist,
              items,
              updatedAt: Date.now(),
            };
          }),
        })),

      moveItemBetweenChecklists: (
        sourceChecklistId: string,
        targetChecklistId: string,
        itemId: string,
        targetIndex: number
      ) =>
        set((state) => {
          const sourceChecklist = state.checklists.find((c) => c.id === sourceChecklistId);
          const item = sourceChecklist?.items.find((i) => i.id === itemId);

          if (!item || !sourceChecklist) return state;

          return {
            checklists: state.checklists.map((checklist) => {
              // Remove from source checklist
              if (checklist.id === sourceChecklistId) {
                return {
                  ...checklist,
                  items: checklist.items.filter((i) => i.id !== itemId),
                  updatedAt: Date.now(),
                };
              }

              // Add to target checklist
              if (checklist.id === targetChecklistId) {
                const newItems = [...checklist.items];
                newItems.splice(targetIndex, 0, { ...item, updatedAt: Date.now() });
                return {
                  ...checklist,
                  items: newItems,
                  updatedAt: Date.now(),
                };
              }

              return checklist;
            }),
          };
        }),

      // Bulk actions
      deleteAllCompleted: (checklistId: string) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: checklist.items.filter((item) => !item.completed),
                  updatedAt: Date.now(),
                }
              : checklist
          ),
        })),

      uncheckAll: (checklistId: string) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: checklist.items.map((item) => ({
                    ...item,
                    completed: false,
                    updatedAt: Date.now(),
                  })),
                  updatedAt: Date.now(),
                }
              : checklist
          ),
        })),

      selectAll: (checklistId: string) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: checklist.items.map((item) => ({
                    ...item,
                    completed: true,
                    updatedAt: Date.now(),
                  })),
                  updatedAt: Date.now(),
                }
              : checklist
          ),
        })),

      deselectAll: (checklistId: string) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: checklist.items.map((item) => ({
                    ...item,
                    completed: false,
                    updatedAt: Date.now(),
                  })),
                  updatedAt: Date.now(),
                }
              : checklist
          ),
        })),

      // Optional item features
      addSubItem: (checklistId: string, parentId: string, text: string) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) => {
            if (checklist.id !== checklistId) return checklist;

            const newSubItem: ChecklistItem = {
              id: generateId(),
              text,
              completed: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            return {
              ...checklist,
              items: checklist.items.map((item) =>
                item.id === parentId
                  ? {
                      ...item,
                      subItems: [...(item.subItems || []), newSubItem],
                      updatedAt: Date.now(),
                    }
                  : item
              ),
              updatedAt: Date.now(),
            };
          }),
        })),

      setItemDueDate: (checklistId: string, itemId: string, dueDate: number | undefined) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: checklist.items.map((item) =>
                    item.id === itemId
                      ? { ...item, dueDate, updatedAt: Date.now() }
                      : item
                  ),
                  updatedAt: Date.now(),
                }
              : checklist
          ),
        })),

      setItemNotes: (checklistId: string, itemId: string, notes: string) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: checklist.items.map((item) =>
                    item.id === itemId
                      ? { ...item, notes, updatedAt: Date.now() }
                      : item
                  ),
                  updatedAt: Date.now(),
                }
              : checklist
          ),
        })),

      setItemPriority: (checklistId: string, itemId: string, priority: Priority | undefined) =>
        set((state) => ({
          checklists: state.checklists.map((checklist) =>
            checklist.id === checklistId
              ? {
                  ...checklist,
                  items: checklist.items.map((item) =>
                    item.id === itemId
                      ? { ...item, priority, updatedAt: Date.now() }
                      : item
                  ),
                  updatedAt: Date.now(),
                }
              : checklist
          ),
        })),
    }),
    {
      name: 'checklist-storage',
    }
  )
);
