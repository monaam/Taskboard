/**
 * Chip styling shared by the view filter bars.
 *
 * A plain module rather than an export from ScheduleFilterBar, which owned these
 * first: eslint-plugin-react-refresh flags non-component exports from a
 * component module, and two bars that are meant to be the same control must not
 * be able to drift apart.
 */

// Same segments TriageRow and ScheduleRow use. Reusing the vocabulary is the
// point: the chip you press to set an impact looks like the chip you press to
// filter by it, so the second control needs no explaining once you know the
// first.
export const SEG =
  'shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium leading-5 transition-colors';

export const SEG_OFF = 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50';
