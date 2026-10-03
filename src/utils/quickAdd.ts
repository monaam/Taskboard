/**
 * Quick-add token parser.
 *
 * Turns one line of typing into a task plus its fields:
 *
 *   "call the bank tomorrow !high &quick"
 *     -> text "call the bank", scheduledFor tomorrow, impact high, effort quick
 *
 * The tokens are surfaced back to the caller as chips, so the syntax is visible
 * as it is typed rather than being hidden knowledge. Every token is therefore
 * reported with its source range: a chip's × removes exactly the characters it
 * came from (see removeKind), which is why ranges are carried around instead of
 * just values.
 *
 * Dates stay 'YYYY-MM-DD' strings throughout and all arithmetic goes through
 * utils/dates — see the timezone note at the top of that file.
 */

import { Checklist, Effort, EFFORT_META, Impact, IMPACT_META, ItemFields } from '../types';
import { addDaysISO, formatDateShort, todayLocalISO } from './dates';

export type TokenKind = 'scheduled' | 'due' | 'impact' | 'effort' | 'list';

export type QuickAddToken = {
  kind: TokenKind;
  /** Chip text: 'Oct 4', 'High', '#work'. */
  label: string;
  /** Source range in the raw input, excluding the separator that preceded it. */
  start: number;
  end: number;
  /** 'YYYY-MM-DD' for dates, an Impact/Effort for those, the bare name for a list. */
  value: string;
};

export type QuickAddParse = {
  /** The raw input with every recognized token removed. */
  text: string;
  /** One per winning token, in TokenKind order — what the chip row renders. */
  tokens: QuickAddToken[];
  /** Ready for addItem. Only fields an actual token set are present. */
  fields: ItemFields;
  /** The bare name from a #name token, before it is matched to a checklist. */
  listQuery: string | null;
};

// A token must start the line or follow whitespace, so a '#' or '!' inside a
// word ("plan#2", "wow!high") is left alone as ordinary text. Written as a
// capture group rather than a lookbehind purely for Safari < 16.4.
const SEP = '(^|\\s)';

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const IMPACT_WORDS: Record<string, Impact> = {
  low: 'low',
  med: 'medium',
  medium: 'medium',
  high: 'high',
};

const EFFORT_WORDS: Record<string, Effort> = {
  quick: 'quick',
  mod: 'moderate',
  moderate: 'moderate',
  heavy: 'heavy',
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Whether a 'YYYY-MM-DD' string names a day that exists. A shape check alone
 * is not enough: the (y, m-1, d) constructor silently rolls Feb 30 into Mar 2,
 * so the only honest test is a round trip.
 */
const isRealDate = (iso: string): boolean => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

/** The coming <weekday>, or today when today already is that weekday. */
const nextWeekday = (today: string, dow: number): string => {
  const [y, m, d] = today.split('-').map(Number);
  const current = new Date(y, m - 1, d).getDay();
  return addDaysISO(today, (dow - current + 7) % 7);
};

/**
 * The next <month> <day> at or after today, so "oct 15" typed in November
 * means next year rather than a date ten months in the past. An explicit year
 * is always taken literally.
 */
const monthDay = (today: string, month: number, day: number, year?: number): string | null => {
  const on = (y: number) => {
    const iso = `${y}-${pad2(month)}-${pad2(day)}`;
    return isRealDate(iso) ? iso : null;
  };
  if (year !== undefined) return on(year);
  const thisYear = Number(today.slice(0, 4));
  const candidate = on(thisYear);
  // Feb 29 can be unreal this year and real the next, so both are tried.
  return candidate && candidate >= today ? candidate : on(thisYear + 1);
};

type Matcher = {
  kind: Exclude<TokenKind, 'due'>;
  source: string;
  /** null rejects the match and leaves the characters as plain text. */
  resolve: (m: RegExpExecArray, today: string) => string | null;
};

// Order matters only for same-start ties, which overlap resolution breaks by
// length; these are otherwise all scanned independently.
const MATCHERS: Matcher[] = [
  {
    kind: 'impact',
    source: `${SEP}!(low|med|medium|high)\\b`,
    resolve: (m) => IMPACT_WORDS[m[2].toLowerCase()] ?? null,
  },
  {
    // '&' is safe behind the start-or-whitespace rule: "R&D" has no separator
    // before it and "Tom & Jerry" has a space after it, so neither can match.
    kind: 'effort',
    source: `${SEP}&(quick|mod|moderate|heavy)\\b`,
    resolve: (m) => EFFORT_WORDS[m[2].toLowerCase()] ?? null,
  },
  {
    kind: 'list',
    // Not \\w: a checklist title may be hyphenated, and '#q1-goals' should be
    // one token rather than '#q1' plus stray text.
    source: `${SEP}#([\\w-]+)`,
    resolve: (m) => m[2],
  },
  {
    kind: 'scheduled',
    source: `${SEP}(\\d{4}-\\d{2}-\\d{2})\\b`,
    // Guarded, not trusted: the shape matches but 2026-13-40 does not exist,
    // and the server rejects it with a 400 after the row is already on screen.
    resolve: (m) => (isRealDate(m[2]) ? m[2] : null),
  },
  {
    kind: 'scheduled',
    source: `${SEP}(today)\\b`,
    resolve: (_m, today) => today,
  },
  {
    // 'tom' is an accepted abbreviation by request. It does collide with the
    // name — "call tom about it" reads as a date — which is survivable only
    // because the chip shows the reading and removes it in one click.
    // 'tomorrow' is listed first so alternation prefers the long form.
    kind: 'scheduled',
    source: `${SEP}(tomorrow|tmrw|tmr|tom)\\b`,
    resolve: (_m, today) => addDaysISO(today, 1),
  },
  {
    kind: 'scheduled',
    source: `${SEP}(next\\s+week)\\b`,
    resolve: (_m, today) => addDaysISO(today, 7),
  },
  {
    kind: 'scheduled',
    source: `${SEP}\\+(\\d{1,3})\\s*([dw])\\b`,
    resolve: (m, today) => {
      const n = Number(m[2]);
      return addDaysISO(today, m[3].toLowerCase() === 'w' ? n * 7 : n);
    },
  },
  {
    kind: 'scheduled',
    source: `${SEP}(sun|sunday|mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)\\b`,
    resolve: (m, today) => nextWeekday(today, WEEKDAYS[m[2].toLowerCase()]),
  },
  {
    kind: 'scheduled',
    // The day number is required, which is what keeps the English word "may"
    // from being read as a month in "may need to call them".
    source: `${SEP}(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\\.?\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?\\b`,
    resolve: (m, today) =>
      monthDay(today, MONTHS[m[2].toLowerCase()], Number(m[3]), m[4] ? Number(m[4]) : undefined),
  },
];

type RawMatch = {
  kind: TokenKind;
  start: number;
  end: number;
  value: string;
};

/**
 * 'due' immediately before a date turns it into a due date. Handled by looking
 * behind the match rather than by duplicating all eight date patterns, so the
 * two date kinds can never drift apart.
 */
const DUE_PREFIX = /(^|\s)due\s+$/i;

const withDuePrefix = (raw: string, match: RawMatch): RawMatch => {
  if (match.kind !== 'scheduled') return match;
  const before = raw.slice(0, match.start);
  const prefix = DUE_PREFIX.exec(before);
  if (!prefix) return match;
  // prefix[1] is the separator before 'due' and belongs to the text, not the token.
  return { ...match, kind: 'due', start: before.length - prefix[0].length + prefix[1].length };
};

const KIND_ORDER: TokenKind[] = ['scheduled', 'due', 'impact', 'effort', 'list'];

const labelFor = (kind: TokenKind, value: string): string => {
  switch (kind) {
    case 'scheduled':
      return formatDateShort(value);
    case 'due':
      return `Due ${formatDateShort(value)}`;
    case 'impact':
      return IMPACT_META[value as Impact].label;
    case 'effort':
      return EFFORT_META[value as Effort].label;
    case 'list':
      return `#${value}`;
  }
};

export const parseQuickAdd = (raw: string, today: string = todayLocalISO()): QuickAddParse => {
  const found: RawMatch[] = [];

  for (const matcher of MATCHERS) {
    // Built per call: a module-level /g regex carries lastIndex between calls,
    // and this runs on every keystroke.
    const re = new RegExp(matcher.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      const value = matcher.resolve(m, today);
      if (value === null) continue;
      const start = m.index + m[1].length;
      found.push(withDuePrefix(raw, { kind: matcher.kind, start, end: m.index + m[0].length, value }));
    }
  }

  // Longest match at a given start wins, so 'oct 15 2027' beats 'oct 15' and
  // 'next week' beats a stray weekday reading.
  found.sort((a, b) => a.start - b.start || b.end - a.end);

  const accepted: RawMatch[] = [];
  let consumedTo = -1;
  for (const match of found) {
    if (match.start < consumedTo) continue;
    accepted.push(match);
    consumedTo = match.end;
  }

  // Last of each kind wins: typing '!low' and then '!high' is a correction, and
  // honouring the first would make the chip contradict what was just typed.
  // Every occurrence is still stripped from the text.
  const winners = new Map<TokenKind, RawMatch>();
  for (const match of accepted) winners.set(match.kind, match);

  let text = '';
  let cursor = 0;
  for (const match of accepted) {
    text += raw.slice(cursor, match.start);
    cursor = match.end;
  }
  text += raw.slice(cursor);

  const tokens: QuickAddToken[] = KIND_ORDER.flatMap((kind) => {
    const match = winners.get(kind);
    return match ? [{ kind, label: labelFor(kind, match.value), start: match.start, end: match.end, value: match.value }] : [];
  });

  const scheduled = winners.get('scheduled');
  const due = winners.get('due');
  const impact = winners.get('impact');
  const effort = winners.get('effort');

  return {
    text: text.replace(/\s+/g, ' ').trim(),
    tokens,
    fields: {
      ...(scheduled && { scheduledFor: scheduled.value }),
      ...(due && { dueDate: due.value }),
      ...(impact && { impact: impact.value as Impact }),
      ...(effort && { effort: effort.value as Effort }),
    },
    listQuery: winners.get('list')?.value ?? null,
  };
};

/**
 * The raw input with every occurrence of one token kind removed — what a chip's
 * × does. Re-parses rather than trusting ranges from an older parse, so it
 * cannot cut the wrong characters after the input has changed.
 */
export const removeKind = (raw: string, kind: TokenKind, today: string = todayLocalISO()): string => {
  let text = raw;
  // One pass removes the current winner of this kind; an earlier duplicate
  // becomes the winner on the next. Re-parsing each time rather than reusing
  // ranges from a single parse is what makes this correct for duplicates, and
  // it terminates because every token spans at least one character.
  for (let guard = 0; guard < 32; guard++) {
    const token = parseQuickAdd(text, today).tokens.find((t) => t.kind === kind);
    if (!token) break;
    text = `${text.slice(0, token.start)}${text.slice(token.end)}`;
  }
  return text.replace(/\s+/g, ' ').trim();
};

/**
 * Matches a #name token to a checklist: exact title first, then prefix, then
 * substring, all case-insensitive. Returns null when nothing matches, leaving
 * the caller's default target in place.
 */
export const resolveChecklist = (checklists: Checklist[], query: string | null): Checklist | null => {
  if (!query) return null;
  const q = query.toLowerCase();
  return (
    checklists.find((c) => c.title.toLowerCase() === q) ??
    checklists.find((c) => c.title.toLowerCase().startsWith(q)) ??
    checklists.find((c) => c.title.toLowerCase().includes(q)) ??
    null
  );
};

/** Chip classes per kind. Written out in full — Tailwind scans source text. */
export const TOKEN_CHIP: Record<TokenKind, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  due: 'bg-rose-100 text-rose-700',
  impact: 'bg-amber-100 text-amber-700',
  effort: 'bg-emerald-100 text-emerald-700',
  list: 'bg-gray-200 text-gray-700',
};
