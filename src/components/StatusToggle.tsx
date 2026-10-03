import { ReactNode } from 'react';
import { ItemStatus, STATUS_META, STATUS_ORDER } from '../types';

interface StatusToggleProps {
  status: ItemStatus;
  onChange: (next: ItemStatus) => void;
}

// One size everywhere, 86px wide. There was a larger variant for the board, but
// the board card is the tightest surface there is — 384px, of which the drag
// handle, details and delete buttons already take ~88px — so the big one was
// exactly the wrong way round and left the task text about 134px.

// Each state gets its own lit colour. Deliberately NOT STATUS_META.chip, which
// is tuned for badges: there, To do and Done are both muted grey, which is
// right beside a label and useless here — in a toggle the two ends would look
// identical and the control would read as having no position.
const ACTIVE: Record<ItemStatus, string> = {
  todo: 'bg-gray-200 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-blue-600 text-white',
};

const ICONS: Record<ItemStatus, ReactNode> = {
  todo: <circle cx="12" cy="12" r="8" strokeWidth={2} />,
  in_progress: (
    <>
      <circle cx="12" cy="12" r="8" strokeWidth={2} />
      {/* Left half solid: started, not finished. */}
      <path d="M12 4a8 8 0 000 16V4z" fill="currentColor" stroke="none" />
    </>
  ),
  done: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />,
};

/**
 * The status control on a row: three positions, one click to any of them.
 *
 * Replaces the tri-state checkbox this started as. That control could only move
 * forwards, so Done -> In progress meant walking the whole cycle, and its
 * single box could show the current state but not the ones available. Three
 * segments show all three and cost one click each.
 *
 * role="radiogroup" rather than a checkbox: there is nothing binary left to
 * check, and three radios is exactly what this is.
 */
export const StatusToggle = ({ status, onChange }: StatusToggleProps) => (
  <div
    role="radiogroup"
    aria-label="Status"
    // mt-0.5 matches what the checkbox had: the rows are items-start, so the
    // control aligns to the first line of a wrapping label, not its middle.
    className="mt-0.5 inline-flex h-6 shrink-0 divide-x divide-gray-200 overflow-hidden rounded-md border border-gray-200 bg-white"
  >
    {STATUS_ORDER.map((value) => {
      const active = status === value;
      return (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={active}
          aria-label={STATUS_META[value].label}
          title={STATUS_META[value].label}
          onClick={() => onChange(value)}
          className={`w-7 flex items-center justify-center transition-colors ${
            active ? ACTIVE[value] : 'text-gray-300 hover:bg-gray-50 hover:text-gray-500'
          }`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            {ICONS[value]}
          </svg>
        </button>
      );
    })}
  </div>
);
