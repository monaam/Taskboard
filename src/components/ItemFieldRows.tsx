import { useId } from 'react';

// Module-private on purpose: exporting a non-component from a file that also
// exports components trips react-refresh/only-export-components.
const SEGMENT_BASE =
  'flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors border';

interface DateRowProps {
  label: string;
  value: string;
  onCommit: (raw: string) => void;
}

export const DateRow = ({ label, value, onCommit }: DateRowProps) => (
  <div className="mb-4">
    <div className="text-xs font-medium text-gray-500 mb-1.5">{label}</div>
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={value}
        min="1900-01-01"
        max="2999-12-31"
        onChange={(e) => onCommit(e.target.value)}
        aria-label={label}
        className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400"
      />
      {/* Chrome renders a clear affordance inside the input; Safari and Firefox
          do not, so without this a mis-set date is a dead end. */}
      <button
        type="button"
        onClick={() => onCommit('')}
        disabled={value === ''}
        className="px-2 py-2 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:hover:text-gray-500"
      >
        Clear
      </button>
    </div>
  </div>
);

interface ChoiceRowProps<T extends string> {
  label: string;
  options: T[];
  meta: Record<T, { label: string; chip: string }>;
  value: T | null;
  onChange: (value: T | null) => void;
}

/** One generic segmented control for both impact and effort, including the
 *  leading "—" clear option. */
export const ChoiceRow = <T extends string>({
  label,
  options,
  meta,
  value,
  onChange,
}: ChoiceRowProps<T>) => (
  <div className="mb-4">
    <div className="text-xs font-medium text-gray-500 mb-1.5">{label}</div>
    <div role="radiogroup" aria-label={label} className="flex gap-1.5">
      {/* type="button" on every one of these: inside the create form, a bare
          <button> defaults to type="submit". */}
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        aria-label={`No ${label.toLowerCase()} set`}
        onClick={() => onChange(null)}
        className={`${SEGMENT_BASE} ${
          !value
            ? 'bg-gray-200 text-gray-700 border-gray-300'
            : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
        }`}
      >
        —
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={`${SEGMENT_BASE} ${
            value === option
              ? `${meta[option].chip} border-transparent`
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {meta[option].label}
        </button>
      ))}
    </div>
  </div>
);

interface NotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  rows?: number;
}

export const NotesField = ({ value, onChange, onBlur, rows = 5 }: NotesFieldProps) => {
  // useId, not a literal: both drawers can never be open at once today, but a
  // hardcoded id is one refactor away from being duplicated in the DOM.
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-500 mb-1.5">
        Notes
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={rows}
        placeholder="Add notes..."
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 resize-y"
      />
    </div>
  );
};
