import { ChecklistItem } from '../types';

/**
 * "Live work" — what the priority and schedule views both operate on.
 *
 * Blank rows exist (insertItemAfter creates text:'' before the user types) and
 * are unidentifiable in a cross-checklist list. Completed items are done — both
 * views are "what to do next" surfaces.
 *
 * Shared rather than duplicated per view: two copies of this predicate would
 * drift, and an item silently appearing in one view but not the other is the
 * kind of bug nobody reports.
 */
export const isEligible = (i: ChecklistItem) => !i.completed && i.text.trim() !== '';
