export type Priority = 'low' | 'medium' | 'high';

// Google Keep-like colors
export type ChecklistColor =
  | 'default'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'brown'
  | 'gray';

export const CHECKLIST_COLORS: Record<ChecklistColor, { bg: string; header: string }> = {
  default: { bg: 'bg-white', header: 'bg-gray-50' },
  red: { bg: 'bg-red-100', header: 'bg-red-200' },
  orange: { bg: 'bg-orange-100', header: 'bg-orange-200' },
  yellow: { bg: 'bg-yellow-100', header: 'bg-yellow-200' },
  green: { bg: 'bg-green-100', header: 'bg-green-200' },
  teal: { bg: 'bg-teal-100', header: 'bg-teal-200' },
  blue: { bg: 'bg-blue-100', header: 'bg-blue-200' },
  purple: { bg: 'bg-purple-100', header: 'bg-purple-200' },
  pink: { bg: 'bg-pink-100', header: 'bg-pink-200' },
  brown: { bg: 'bg-amber-200', header: 'bg-amber-300' },
  gray: { bg: 'bg-gray-200', header: 'bg-gray-300' },
};

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
  color: ChecklistColor;
  order?: number;
  createdAt: number;
  updatedAt: number;
};

export type ChecklistState = {
  checklists: Checklist[];
  createChecklist: (title: string, x?: number, y?: number) => void;
  updateChecklistTitle: (checklistId: string, title: string) => void;
  updateChecklistPosition: (checklistId: string, x: number, y: number) => void;
  updateChecklistColor: (checklistId: string, color: ChecklistColor) => void;
  deleteChecklist: (checklistId: string) => void;
  addItem: (checklistId: string, text: string) => void;
  insertItemAfter: (checklistId: string, afterItemId: string) => string;
  deleteItem: (checklistId: string, itemId: string) => void;
  updateItemText: (checklistId: string, itemId: string, text: string) => void;
  toggleItemComplete: (checklistId: string, itemId: string) => void;
  reorderItems: (checklistId: string, startIndex: number, endIndex: number) => void;
  reorderChecklists: (startIndex: number, endIndex: number) => void;
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

// Text note on canvas
export type TextNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number; // in pixels
  color: ChecklistColor;
  createdAt: number;
  updatedAt: number;
};

export type TextNoteState = {
  textNotes: TextNote[];
  createTextNote: (text: string, x?: number, y?: number) => void;
  updateTextNoteText: (noteId: string, text: string) => void;
  updateTextNotePosition: (noteId: string, x: number, y: number) => void;
  updateTextNoteFontSize: (noteId: string, fontSize: number) => void;
  updateTextNoteColor: (noteId: string, color: ChecklistColor) => void;
  deleteTextNote: (noteId: string) => void;
};
