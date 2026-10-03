export type TokenScope = 'read' | 'write';

/** An API token as the server returns it — never including the token value,
 *  which exists only in the response that created it. */
export type ApiToken = {
  id: string;
  name: string;
  /** The first characters of the value, for telling tokens apart. */
  prefix: string;
  scope: TokenScope;
  /** ISO timestamps, unlike item dates, which are calendar days. */
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

/** Only the create response carries the value. */
export type CreatedApiToken = ApiToken & { token: string };

// Three states, one field: a pair of booleans could encode "done and also in
// progress", and something has to answer for that every time it is read.
export type ItemStatus = 'todo' | 'in_progress' | 'done';

export type Impact = 'low' | 'medium' | 'high';
export type Effort = 'quick' | 'moderate' | 'heavy';

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

// Class strings must be written out in full — Tailwind scans source text and
// cannot resolve interpolated class names.
export const IMPACT_META: Record<Impact, { label: string; chip: string }> = {
  low: { label: 'Low', chip: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', chip: 'bg-amber-100 text-amber-700' },
  high: { label: 'High', chip: 'bg-red-100 text-red-700' },
};

export const EFFORT_META: Record<Effort, { label: string; chip: string }> = {
  quick: { label: 'Quick', chip: 'bg-green-100 text-green-700' },
  moderate: { label: 'Moderate', chip: 'bg-blue-100 text-blue-700' },
  heavy: { label: 'Heavy', chip: 'bg-purple-100 text-purple-700' },
};

// Class strings in full, same reason as IMPACT_META below.
export const STATUS_META: Record<ItemStatus, { label: string; chip: string }> = {
  todo: { label: 'To do', chip: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In progress', chip: 'bg-blue-100 text-blue-700' },
  done: { label: 'Done', chip: 'bg-gray-100 text-gray-500' },
};

// Display order everywhere a status is offered, and the natural order of work.
export const STATUS_ORDER: ItemStatus[] = ['todo', 'in_progress', 'done'];

export const IMPACT_ORDER: Impact[] = ['low', 'medium', 'high'];
export const EFFORT_ORDER: Effort[] = ['quick', 'moderate', 'heavy'];

export type ChecklistItem = {
  id: string;
  text: string;
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;
  // null means "not triaged". Dates are 'YYYY-MM-DD' strings, never Date —
  // converting would shift the day in any timezone behind UTC.
  scheduledFor?: string | null;
  dueDate?: string | null;
  impact?: Impact | null;
  effort?: Effort | null;
  notes?: string | null;
};

// The field bag shared by updateItemFields and addItem.
export type ItemFields = Partial<
  Pick<ChecklistItem, 'scheduledFor' | 'dueDate' | 'impact' | 'effort' | 'notes'>
>;

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
  addItem: (checklistId: string, text: string, fields?: ItemFields) => Promise<void>;
  insertItemAfter: (checklistId: string, afterItemId: string) => string;
  deleteItem: (checklistId: string, itemId: string) => void;
  updateItemText: (checklistId: string, itemId: string, text: string) => void;
  // The row path: sets a status and raises the undo toast on a completion.
  chooseItemStatus: (checklistId: string, itemId: string, status: ItemStatus) => void;
  // The silent primitive behind chooseItemStatus: sets an absolute state and
  // raises no toast. Promise<void> because chooseItemStatus awaits it.
  setItemStatus: (checklistId: string, itemId: string, status: ItemStatus) => Promise<void>;
  reorderItems: (checklistId: string, startIndex: number, endIndex: number) => void;
  reorderChecklists: (startIndex: number, endIndex: number) => void;
  arrangeChecklists: (positions: { id: string; x: number; y: number }[]) => void;
  moveItemBetweenChecklists: (sourceChecklistId: string, targetChecklistId: string, itemId: string, targetIndex: number) => void;
  deleteAllCompleted: (checklistId: string) => void;
  uncheckAll: (checklistId: string) => void;
  selectAll: (checklistId: string) => void;
  deselectAll: (checklistId: string) => void;
  updateItemFields: (checklistId: string, itemId: string, fields: ItemFields) => void;
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
