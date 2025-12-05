export type Priority = 'low' | 'medium' | 'high';

export type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  subItems?: ChecklistItem[];
  dueDate?: number;
  notes?: string;
  priority?: Priority;
};

export type Checklist = {
  id: string;
  title: string;
  items: ChecklistItem[];
  x: number;
  y: number;
  createdAt: number;
  updatedAt: number;
};

export type ChecklistState = {
  checklists: Checklist[];
  createChecklist: (title: string, x?: number, y?: number) => void;
  updateChecklistTitle: (checklistId: string, title: string) => void;
  updateChecklistPosition: (checklistId: string, x: number, y: number) => void;
  deleteChecklist: (checklistId: string) => void;
  addItem: (checklistId: string, text: string) => void;
  deleteItem: (checklistId: string, itemId: string) => void;
  updateItemText: (checklistId: string, itemId: string, text: string) => void;
  toggleItemComplete: (checklistId: string, itemId: string) => void;
  reorderItems: (checklistId: string, startIndex: number, endIndex: number) => void;
  moveItemBetweenChecklists: (sourceChecklistId: string, targetChecklistId: string, itemId: string, targetIndex: number) => void;
  deleteAllCompleted: (checklistId: string) => void;
  uncheckAll: (checklistId: string) => void;
  selectAll: (checklistId: string) => void;
  deselectAll: (checklistId: string) => void;
  addSubItem: (checklistId: string, parentId: string, text: string) => void;
  setItemDueDate: (checklistId: string, itemId: string, dueDate: number | undefined) => void;
  setItemNotes: (checklistId: string, itemId: string, notes: string) => void;
  setItemPriority: (checklistId: string, itemId: string, priority: Priority | undefined) => void;
};

export type DisplaySettings = {
  hideCompleted: boolean;
  moveCompletedToBottom: boolean;
};
