// Dates are stored and compared as 'YYYY-MM-DD' strings.
//
// Never call `new Date('2026-08-15')`: ISO date-only strings are parsed as UTC,
// so anywhere west of Greenwich they render as the previous day. Every Date
// built here uses the (year, monthIndex, day) constructor, which is local.

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Today in the local timezone. Not toISOString().slice(0,10) — that's UTC. */
export const todayLocalISO = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * 'Jan 5', or 'Jan 5, 2027' when the year differs from the current one.
 * Guards the format first: Date silently rolls 2026-13-40 over into a
 * plausible-looking but wrong day.
 */
export const formatDateShort = (s: string): string => {
  if (!DATE_RE.test(s)) return s;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return s;
  const label = `${MONTHS[m - 1]} ${d}`;
  return y === new Date().getFullYear() ? label : `${label}, ${y}`;
};

// Zero-padded 'YYYY-MM-DD' sorts lexicographically in date order, so these
// need no date math at all.
export const isOverdue = (s: string, today: string): boolean => DATE_RE.test(s) && s < today;

export const isToday = (s: string, today: string): boolean => DATE_RE.test(s) && s === today;
