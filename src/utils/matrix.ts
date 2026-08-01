import { ChecklistItem, Effort, Impact } from '../types';

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
