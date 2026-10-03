import { ItemStatus, STATUS_META, STATUS_ORDER } from '../types';
import { SEG, SEG_OFF } from '../utils/chips';

interface StatusPickerProps {
  status: ItemStatus;
  onChange: (next: ItemStatus) => void;
  /**
   * 'panel' fills the width and matches ChoiceRow, for the detail drawer.
   * 'row'  is the compact chip trio the view rows already use for impact.
   */
  variant?: 'panel' | 'row';
}

// Mirrors the module-private SEGMENT_BASE in ItemFieldRows, so the status row
// in the detail panel is pixel-identical to the impact and effort rows beneath
// it. Duplicated rather than exported from there: that file exports components,
// and react-refresh/only-export-components flags a non-component export.
const PANEL_SEG = 'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors border';

/**
 * Direct status selection: one click lands on any of the three states.
 *
 * The tri-state checkbox on a row is the fast path — one click to start, one
 * more to finish — but it can only move forwards, so going from Done back to In
 * progress means walking the whole cycle. This is the control that goes
 * anywhere in one click, and it is the same vocabulary as the impact and effort
 * chips, so it needs no explaining.
 *
 * No clear option, unlike ChoiceRow: every item has a status, and 'todo' is
 * already the empty one.
 */
export const StatusPicker = ({ status, onChange, variant = 'panel' }: StatusPickerProps) => {
  const segments = STATUS_ORDER.map((value) => {
    const active = status === value;
    return (
      <button
        key={value}
        type="button"
        role="radio"
        aria-checked={active}
        // type="button" above is load-bearing in the detail panel: a bare
        // <button> inside a form defaults to submit.
        onClick={() => onChange(value)}
        className={
          variant === 'panel'
            ? `${PANEL_SEG} ${
                active
                  ? `${STATUS_META[value].chip} border-transparent`
                  : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
              }`
            : `${SEG} ${active ? `${STATUS_META[value].chip} border-transparent` : SEG_OFF}`
        }
      >
        {STATUS_META[value].label}
      </button>
    );
  });

  if (variant === 'row') {
    return (
      <div role="radiogroup" aria-label="Status" className="flex items-center gap-1">
        {segments}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-gray-500 mb-1.5">Status</div>
      <div role="radiogroup" aria-label="Status" className="flex gap-1.5">
        {segments}
      </div>
    </div>
  );
};
