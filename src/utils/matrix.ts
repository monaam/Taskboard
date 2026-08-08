import { ChecklistItem, Effort, Impact } from '../types';
import { isOverdue } from './dates';

/**
 * Shared vocabulary for the priority view. Lives in a plain module rather than
 * alongside the components: eslint-plugin-react-refresh flags non-component
 * exports from a component module, and both the view and the matrix need these.
 */

// The matrix is flat across checklists, so an entry has to carry its origin —
// otherwise a cell says what to do without saying where it came from.
export type PriorityEntry = { item: ChecklistItem; checklistId: string; checklistTitle: string };

export type TriageGroup = { checklistId: string; title: string; items: ChecklistItem[] };

// Top-to-bottom, high first, so the "act now" corner lands top-left where the
// eye starts. Written out rather than [...IMPACT_ORDER].reverse() — IMPACT_ORDER
// is a shared exported array and reverse() mutates in place.
export const MATRIX_IMPACT_ROWS: Impact[] = ['high', 'medium', 'low'];

// '|' appears in neither vocabulary, so the key is unambiguous.
export const cellKey = (impact: Impact, effort: Effort) => `${impact}|${effort}`;

/**
 * What to actually do with the items in a cell.
 *
 * Keyed by the pair, NOT by the priority score, and it cannot be derived from
 * one: getPriorityChip scores impact + ease, which gives high/heavy,
 * medium/moderate and low/quick an identical 4. Those three deserve the same
 * colour — they are worth the same — but the verbs are nothing alike ("Break
 * down" a major project vs "Schedule" it vs squeeze in a "Fill-in"). The score
 * collapses exactly the distinction the action label exists to make.
 *
 * A nested record rather than a cellKey lookup so TypeScript checks all nine
 * are present.
 */
export const CELL_ACTIONS: Record<Impact, Record<Effort, string>> = {
  high: { quick: 'Do now', moderate: 'Plan next', heavy: 'Break down' },
  medium: { quick: 'Quick win', moderate: 'Schedule', heavy: 'Defer' },
  low: { quick: 'Fill-in', moderate: 'Backlog', heavy: 'Drop' },
};

// Module-level so `cells.get(k) ?? EMPTY_ENTRIES` doesn't allocate a new array
// per cell per render.
export const EMPTY_ENTRIES: PriorityEntry[] = [];

/**
 * Narrows the matrix. The triage column is deliberately untouched, for the same
 * reason the schedule view leaves its agenda whole: a filter set on one column
 * should not make the other column lie about what is in it.
 *
 * Note what is absent — impact and effort. Those are the grid's own axes, so a
 * filter on them here would only blank out cells the layout already lets you
 * read off directly. What is worth filtering by is what the matrix cannot show,
 * which makes this the mirror of ScheduleFilter: that one narrows a flat backlog
 * by exactly the two dimensions this one leaves alone.
 */
export type ScheduleState = 'any' | 'scheduled' | 'unscheduled';

export type PriorityFilter = {
  /**
   * One enum, not the array-of-two the impact/effort axes use: with only two
   * values a multi-select has a degenerate state, where both selected means the
   * same as neither. A three-way segment cannot express nonsense.
   */
  schedule: ScheduleState;
  /**
   * Narrows (AND), rather than being a fourth ScheduleState — "unscheduled and
   * overdue" is a real question (due in the past, never planned) and a single
   * enum could not ask it.
   *
   * This is the opposite of ScheduleFilter.untriaged, which unions on top of its
   * axes. That one has to: an untriaged item fails every impact chip, so without
   * the escape hatch it would be unreachable. Overdue items are reachable by
   * every other control here, so intersecting is both safe and what you'd guess.
   */
  overdue: boolean;
  /** Checklist ids. Empty means every list, not no list. */
  checklistIds: string[];
};

/** A checklist with at least one item in the matrix — the source-chip vocabulary. */
export type MatrixSource = { checklistId: string; title: string };

// Module-level so "no filter" is referentially stable and filterMatrixCells can
// hand its input straight back.
export const EMPTY_PRIORITY_FILTER: PriorityFilter = {
  schedule: 'any',
  overdue: false,
  checklistIds: [],
};

export const isPriorityFilterActive = (f: PriorityFilter): boolean =>
  f.schedule !== 'any' || f.overdue || f.checklistIds.length > 0;

/** AND across all three controls. */
export const matchesPriorityFilter = (
  entry: PriorityEntry,
  f: PriorityFilter,
  today: string
): boolean => {
  // An empty list means "any", so the other two controls don't silently require
  // a checklist to be picked as well.
  if (f.checklistIds.length > 0 && !f.checklistIds.includes(entry.checklistId)) return false;

  const { scheduledFor, dueDate } = entry.item;

  // Truthiness, not DATE_RE. PriorityMatrix draws its calendar icon on
  // truthiness alone, and a chip disagreeing with the icon rendered two pixels
  // away in the same cell is worse than one disagreeing with schedule.ts about
  // a malformed date a date input cannot produce.
  if (f.schedule === 'scheduled' && !scheduledFor) return false;
  if (f.schedule === 'unscheduled' && scheduledFor) return false;

  // Both dates, for the reason buildScheduleBuckets spells out: an item planned
  // for next week but due yesterday has a stale plan, and checking scheduledFor
  // alone would call it fine.
  if (f.overdue) {
    const late =
      (!!scheduledFor && isOverdue(scheduledFor, today)) || (!!dueDate && isOverdue(dueDate, today));
    if (!late) return false;
  }

  return true;
};

/**
 * Applies a filter across all nine cells.
 *
 * Returns the count alongside, since the caller needs "3 of 12" and only this
 * pass knows the 3.
 */
export const filterMatrixCells = (
  cells: Map<string, PriorityEntry[]>,
  filter: PriorityFilter,
  today: string
): { cells: Map<string, PriorityEntry[]>; count: number } => {
  if (!isPriorityFilterActive(filter)) {
    let count = 0;
    for (const entries of cells.values()) count += entries.length;
    // Same map reference back, so nothing below re-renders on an unrelated store
    // change.
    return { cells, count };
  }

  const next = new Map<string, PriorityEntry[]>();
  let count = 0;
  for (const [key, entries] of cells) {
    const kept = entries.filter((entry) => matchesPriorityFilter(entry, filter, today));
    // Drop the key rather than storing an empty array — MatrixCell already falls
    // back to EMPTY_ENTRIES for a missing one, so the cell renders empty either
    // way and this allocates less.
    if (kept.length === 0) continue;
    next.set(key, kept);
    count += kept.length;
  }
  return { cells: next, count };
};
