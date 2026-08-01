import { Checklist, ChecklistItem } from '../types';
import { addDaysISO, DATE_RE, formatDateShort, formatDayHeading } from './dates';
import { isEligible } from './items';

/**
 * Bucketing for the schedule view. A plain module rather than living beside the
 * component: eslint-plugin-react-refresh flags non-component exports from a
 * component module, and this is the part worth reasoning about on its own.
 *
 * Every comparison here is lexicographic on 'YYYY-MM-DD', which dates.ts
 * establishes as equivalent to date order for zero-padded strings. No date math
 * in the hot path — addDaysISO is called twice, for labels.
 */

// The agenda is flat across checklists, so an entry has to carry its origin —
// otherwise a row says what to do without saying where it came from.
export type ScheduleEntry = {
  item: ChecklistItem;
  checklistId: string;
  checklistTitle: string;
  /** The past date that pushed this into Overdue; absent otherwise. */
  overdueOn?: string;
};

export type SectionKind = 'overdue' | 'today' | 'tomorrow' | 'day';

export type DaySection = {
  /** 'overdue', or the 'YYYY-MM-DD' the section holds. Stable React key. */
  key: string;
  kind: SectionKind;
  /** 'Overdue' | 'Today' | 'Tomorrow' | 'Mon, Aug 3' */
  label: string;
  /** 'Aug 1' beside Today/Tomorrow, so the relative word still names a date. */
  sublabel?: string;
  entries: ScheduleEntry[];
};

export type UnscheduledGroup = {
  checklistId: string;
  title: string;
  items: ChecklistItem[];
};

export type ScheduleBuckets = {
  groups: UnscheduledGroup[];
  sections: DaySection[];
  unscheduledCount: number;
  agendaCount: number;
};

const isPast = (s: string | null | undefined, today: string): s is string =>
  !!s && DATE_RE.test(s) && s < today;

/**
 * Splits every eligible item into the unscheduled column or exactly one agenda
 * section:
 *
 *   overdue = (scheduledFor < today) || (dueDate < today)
 *   if overdue           -> Overdue
 *   else if scheduledFor -> that day's section (guaranteed >= today)
 *   else                 -> Unscheduled
 *
 * Checking dueDate for overdue as well as scheduledFor is the whole point: an
 * item planned for next week but due yesterday has a stale plan, and a
 * scheduledFor-only view would file it under next week and hide that. The
 * converse — a future dueDate with no scheduledFor — stays Unscheduled, which
 * is correct: something due Friday with no plan is exactly what needs a date.
 */
export const buildScheduleBuckets = (
  checklists: Checklist[],
  today: string
): ScheduleBuckets => {
  const groups: UnscheduledGroup[] = [];
  const overdue: ScheduleEntry[] = [];
  // Keyed by 'YYYY-MM-DD'; sorted into sections at the end.
  const byDay = new Map<string, ScheduleEntry[]>();
  let unscheduledCount = 0;
  let agendaCount = 0;

  // Checklists in array order, items in array order — board order is preserved
  // verbatim within every section, so a row never moves because of a change
  // made on some other axis in some other view.
  for (const checklist of checklists) {
    const pending: ChecklistItem[] = [];

    for (const item of checklist.items) {
      if (!isEligible(item)) continue;

      const entry: ScheduleEntry = {
        item,
        checklistId: checklist.id,
        checklistTitle: checklist.title,
      };

      // Called inline rather than through a saved boolean: the type predicate
      // narrows the property at the call site, which is what keeps these
      // pushes free of non-null assertions.
      const pastDates: string[] = [];
      if (isPast(item.scheduledFor, today)) pastDates.push(item.scheduledFor);
      if (isPast(item.dueDate, today)) pastDates.push(item.dueDate);

      if (pastDates.length > 0) {
        // The older of the two is what it has actually been late since.
        entry.overdueOn = pastDates.sort()[0];
        overdue.push(entry);
        agendaCount += 1;
        continue;
      }

      // Not overdue, so any scheduledFor here is today or later.
      if (item.scheduledFor && DATE_RE.test(item.scheduledFor)) {
        const bucket = byDay.get(item.scheduledFor);
        if (bucket) bucket.push(entry);
        else byDay.set(item.scheduledFor, [entry]);
        agendaCount += 1;
        continue;
      }

      pending.push(item);
      unscheduledCount += 1;
    }

    // Emit a group only when it has something, so a fully-scheduled checklist
    // shows no heading at all.
    if (pending.length > 0) {
      groups.push({ checklistId: checklist.id, title: checklist.title, items: pending });
    }
  }

  const sections: DaySection[] = [];

  if (overdue.length > 0) {
    // Oldest first: the longest-ignored thing is the one to look at.
    overdue.sort((a, b) => (a.overdueOn ?? '').localeCompare(b.overdueOn ?? ''));
    sections.push({ key: 'overdue', kind: 'overdue', label: 'Overdue', entries: overdue });
  }

  const tomorrow = addDaysISO(today, 1);

  // Today always renders, even empty: "nothing scheduled today" is information,
  // and it anchors the list so the agenda never looks broken when it is merely
  // free.
  sections.push({
    key: today,
    kind: 'today',
    label: 'Today',
    sublabel: formatDateShort(today),
    entries: byDay.get(today) ?? [],
  });

  const tomorrowEntries = byDay.get(tomorrow);
  if (tomorrowEntries) {
    sections.push({
      key: tomorrow,
      kind: 'tomorrow',
      label: 'Tomorrow',
      sublabel: formatDateShort(tomorrow),
      entries: tomorrowEntries,
    });
  }

  // Everything beyond tomorrow, ascending. No fixed horizon and no empty days:
  // a section exists only if something is in it, so "Later" needs no special
  // case and there is no arbitrary two-week cutoff to fall off the end of.
  const futureKeys = [...byDay.keys()].filter((k) => k > tomorrow).sort();
  for (const key of futureKeys) {
    sections.push({
      key,
      kind: 'day',
      // The weekday IS the label out here — 'Fri, Aug 8' reads as a date in a
      // way a bare 'Aug 8' does not once you are past tomorrow.
      label: formatDayHeading(key),
      entries: byDay.get(key) as ScheduleEntry[],
    });
  }

  return { groups, sections, unscheduledCount, agendaCount };
};
