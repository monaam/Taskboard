import { Effort, Impact, EFFORT_META, IMPACT_META } from '../types';

// Impact rises with its value; effort is inverted into "ease" so both dimensions
// point the same direction and can simply be added.
const IMPACT_RANK: Record<Impact, number> = { low: 1, medium: 2, high: 3 };
const EASE_RANK: Record<Effort, number> = { quick: 3, moderate: 2, heavy: 1 };

// score = impact + ease, so 2 (low impact, heavy) .. 6 (high impact, quick).
//
// Two hue families, not one ramp: green means "act", violet means "defer". The
// large hue jump between scores 5 and 4 is deliberate — it puts the sharpest
// visual break exactly at the do/don't-do boundary, which a smooth ramp buries.
//
// No blue / red / amber here on purpose — the scheduled and due badges own those,
// and reusing them would make a priority tag read as a date signal.
const TIER_CHIPS: Record<number, string> = {
  6: 'bg-emerald-100 text-emerald-800',
  5: 'bg-teal-100 text-teal-700',
  4: 'bg-violet-100 text-violet-700',
  3: 'bg-violet-50 text-violet-600',
  2: 'bg-violet-50 text-violet-600',
};

// Half-triaged: no score exists yet, so the chip stays neutral rather than
// implying a priority the data doesn't support. Gray appears nowhere in
// TIER_CHIPS, so "untriaged" can't be mistaken for a scored value.
const PARTIAL_CHIP = 'bg-gray-100 text-gray-500';

export type PriorityTag = { label: string; chip: string; title: string };

/**
 * Impact and effort collapse into one tag. The two label vocabularies don't
 * overlap (Low/Medium/High vs Quick/Moderate/Heavy), so a single-dimension chip
 * is still unambiguous about which field it came from.
 */
export const getPriorityTag = (
  impact: Impact | null | undefined,
  effort: Effort | null | undefined
): PriorityTag | null => {
  if (impact && effort) {
    return {
      label: `${IMPACT_META[impact].label} · ${EFFORT_META[effort].label}`,
      chip: TIER_CHIPS[IMPACT_RANK[impact] + EASE_RANK[effort]],
      title: `Impact: ${IMPACT_META[impact].label} · Effort: ${EFFORT_META[effort].label}`,
    };
  }
  if (impact) {
    return {
      label: IMPACT_META[impact].label,
      chip: PARTIAL_CHIP,
      title: `Impact: ${IMPACT_META[impact].label}`,
    };
  }
  if (effort) {
    return {
      label: EFFORT_META[effort].label,
      chip: PARTIAL_CHIP,
      title: `Effort: ${EFFORT_META[effort].label}`,
    };
  }
  return null;
};
