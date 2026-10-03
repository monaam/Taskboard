import { useMemo, useState } from 'react';
import { parseQuickAdd, QuickAddParse, removeKind, TOKEN_CHIP } from '../utils/quickAdd';

interface QuickAddInputProps {
  /**
   * Commits the task. Receives the parse rather than a text/fields pair so the
   * caller can also act on listQuery, which only it can resolve.
   */
  onAdd: (parse: QuickAddParse) => Promise<void> | void;
  /**
   * Mirrors the raw input for callers that show a resolved target or hand the
   * typing off to the full form. Called from onChange, never from an effect —
   * an effect here would re-enter the parent on every keystroke.
   */
  onRawChange?: (raw: string) => void;
  /** Fired by Escape only once the input is already empty — see handleKeyDown. */
  onEscape?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  /** The one-line syntax legend. Shown while focused, so it teaches once and
   *  then stays out of the way. */
  showHint?: boolean;
  size?: 'sm' | 'md';
}

// Full class strings, never interpolated fragments — Tailwind scans source text.
const SIZES = {
  sm: { input: 'py-1.5 text-sm', button: 'px-2.5 py-1 text-xs' },
  md: { input: 'py-2.5 text-base', button: 'px-3 py-1.5 text-sm' },
};

/**
 * One line of typing becomes a task with fields: see utils/quickAdd for the
 * token grammar. The parsed tokens are rendered as removable chips under the
 * input, which is what keeps the syntax discoverable rather than secret.
 *
 * Owns its own text state and clears itself after a successful add while
 * keeping focus, so a run of tasks is a run of lines rather than a run of
 * open/fill/submit cycles.
 */
export const QuickAddInput = ({
  onAdd,
  onRawChange,
  onEscape,
  placeholder = 'Add a task…',
  autoFocus = false,
  disabled = false,
  showHint = false,
  size = 'sm',
}: QuickAddInputProps) => {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Re-parsed per keystroke; the whole parse is a few short regex scans over a
  // single line, and memoizing it keeps the chip row from rebuilding on an
  // unrelated re-render.
  const parse = useMemo(() => parseQuickAdd(value), [value]);
  const canAdd = parse.text !== '' && !isBusy && !disabled;

  const change = (next: string) => {
    setValue(next);
    onRawChange?.(next);
  };

  const submit = async () => {
    if (!canAdd) return;
    setIsBusy(true);
    try {
      await onAdd(parse);
      // Cleared only on success, and the input is never unmounted, so focus
      // stays put and the next task is just more typing.
      change('');
    } finally {
      setIsBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
      return;
    }
    if (e.key === 'Escape') {
      // Two stages: clear what was typed, then let the parent close. Otherwise
      // one stray Escape throws away a half-written task with no way back.
      e.stopPropagation();
      if (value !== '') change('');
      else onEscape?.();
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => change(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label="Quick add task"
          className={`flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 ${SIZES[size].input} text-gray-800 outline-none transition-colors focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400`}
        />
        {/* Enter is the fast path; this exists for touch, where the soft
            keyboard's return key is not always a submit. */}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canAdd}
          className={`shrink-0 rounded-lg bg-blue-600 ${SIZES[size].button} font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400`}
        >
          Add
        </button>
      </div>

      {parse.tokens.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {parse.tokens.map((token) => (
            <span
              key={token.kind}
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${TOKEN_CHIP[token.kind]}`}
            >
              {token.label}
              <button
                type="button"
                // Keeps focus in the input, so removing a chip does not break
                // the typing flow it is part of.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => change(removeKind(value, token.kind))}
                aria-label={`Remove ${token.label}`}
                className="opacity-60 transition-opacity hover:opacity-100"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {showHint && isFocused && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
          <span className="font-medium text-gray-500">today</span>,{' '}
          <span className="font-medium text-gray-500">tom</span>,{' '}
          <span className="font-medium text-gray-500">fri</span>,{' '}
          <span className="font-medium text-gray-500">+3d</span>,{' '}
          <span className="font-medium text-gray-500">oct 15</span> · due date{' '}
          <span className="font-medium text-gray-500">due fri</span> · impact{' '}
          <span className="font-medium text-gray-500">!high</span> · effort{' '}
          <span className="font-medium text-gray-500">&amp;quick</span> · list{' '}
          <span className="font-medium text-gray-500">#work</span>
        </p>
      )}
    </div>
  );
};
