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
  createdAt: number;
  updatedAt: number;
};

export type ChecklistState = {
  checklist: Checklist | null;
  createChecklist: (title: string) => void;
  updateChecklistTitle: (title: string) => void;
  deleteChecklist: () => void;
  addItem: (text: string) => void;
  deleteItem: (itemId: string) => void;
  updateItemText: (itemId: string, text: string) => void;
  toggleItemComplete: (itemId: string) => void;
  reorderItems: (startIndex: number, endIndex: number) => void;
  deleteAllCompleted: () => void;
  uncheckAll: () => void;
  selectAll: () => void;
  deselectAll: () => void;
  addSubItem: (parentId: string, text: string) => void;
  setItemDueDate: (itemId: string, dueDate: number | undefined) => void;
  setItemNotes: (itemId: string, notes: string) => void;
  setItemPriority: (itemId: string, priority: Priority | undefined) => void;
};

export type DisplaySettings = {
  hideCompleted: boolean;
  moveCompletedToBottom: boolean;
};
