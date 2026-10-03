import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiToken, CreatedApiToken, TokenScope } from '../types';
import { apiClient, apiBaseUrl } from '../api/client';
import { useSettingsStore } from '../store/uiStore';
import { SlideOverPanel } from './SlideOverPanel';

/**
 * Settings, which today means API tokens.
 *
 * Mounted outside <Canvas />, like every overlay — see SlideOverPanel.
 */

const SEGMENT = 'flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors';

const EXPIRY_CHOICES: { label: string; days: number | null }[] = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'Never', days: null },
];

/** 'Oct 3, 2026'. These are ISO timestamps, not the calendar-day strings
 *  utils/dates handles, so they get their own formatter. */
const formatStamp = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const isExpired = (token: ApiToken): boolean =>
  !!token.expiresAt && new Date(token.expiresAt).getTime() <= Date.now();

export const SettingsPanel = () => {
  const closeSettings = useSettingsStore((s) => s.closeSettings);

  const [tokens, setTokens] = useState<ApiToken[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<TokenScope>('write');
  const [expiryDays, setExpiryDays] = useState<number | null>(90);
  const [isCreating, setIsCreating] = useState(false);
  // Held in state rather than shown in a toast: this value cannot be recovered,
  // so it must not disappear on a timer.
  const [justCreated, setJustCreated] = useState<CreatedApiToken | null>(null);
  const [copied, setCopied] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const load = useCallback(async () => {
    try {
      setTokens(await apiClient.listTokens());
      setError(null);
    } catch {
      setError('Could not load your tokens.');
      setTokens([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === '' || isCreating) return;
    setIsCreating(true);
    setError(null);
    try {
      const created = await apiClient.createToken({
        name: name.trim(),
        scope,
        expiresInDays: expiryDays,
      });
      setJustCreated(created);
      setCopied(false);
      setName('');
      await load();
    } catch {
      setError('Could not create the token.');
    } finally {
      setIsCreating(false);
    }
  };

  const revoke = async (token: ApiToken) => {
    if (!confirm(`Revoke "${token.name}"? Anything using it stops working immediately.`)) return;
    try {
      await apiClient.revokeToken(token.id);
      // Clear the reveal if it was this token, so a revoked value cannot sit
      // on screen looking usable.
      setJustCreated((current) => (current?.id === token.id ? null : current));
      await load();
    } catch {
      setError('Could not revoke the token.');
    }
  };

  const copy = async () => {
    if (!justCreated) return;
    try {
      await navigator.clipboard.writeText(justCreated.token);
      setCopied(true);
    } catch {
      // Clipboard access can be refused (insecure origin, denied permission).
      // The value is on screen and selectable, so this is not a dead end.
      setCopied(false);
    }
  };

  return (
    <SlideOverPanel ariaLabel="Settings" onClose={closeSettings}>
      <div className="p-4 pb-8 md:pb-4">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Settings
            </div>
            <h2 className="mt-0.5 text-sm font-semibold text-gray-800">API tokens</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeSettings}
            aria-label="Close settings"
            className="-mr-1 shrink-0 p-2 text-gray-400 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-[13px] leading-relaxed text-gray-500">
          Give an agent or a script its own key, instead of your password. Send it as{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-[11.5px] text-gray-700">
            Authorization: Bearer …
          </code>
          .{' '}
          <a
            href={`${apiBaseUrl()}/docs`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-600 hover:text-blue-800"
          >
            API documentation →
          </a>
        </p>

        {/* The one time the value is visible. Deliberately loud, and it stays
            until dismissed — there is no second chance to read it. */}
        {justCreated && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <div className="mb-1.5 text-xs font-semibold text-amber-900">
              Copy this now — it is not shown again
            </div>
            <div className="mb-2 break-all rounded border border-amber-200 bg-white px-2 py-1.5 font-mono text-[11.5px] text-gray-800">
              {justCreated.token}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copy}
                className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => setJustCreated(null)}
                className="text-xs text-amber-800 hover:text-amber-900"
              >
                Done
              </button>
            </div>
          </div>
        )}

        <form onSubmit={create} className="mb-5 rounded-lg border border-gray-200 p-3">
          <label htmlFor="token-name" className="mb-1.5 block text-xs font-medium text-gray-500">
            What is it for?
          </label>
          <input
            id="token-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. planning agent"
            className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400"
          />

          <div className="mb-1.5 text-xs font-medium text-gray-500">Access</div>
          <div role="radiogroup" aria-label="Access" className="mb-1.5 flex gap-1.5">
            {(['read', 'write'] as TokenScope[]).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={scope === value}
                onClick={() => setScope(value)}
                className={`${SEGMENT} ${
                  scope === value
                    ? 'border-transparent bg-blue-100 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {value === 'read' ? 'Read only' : 'Read & write'}
              </button>
            ))}
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-gray-400">
            {scope === 'read'
              ? 'Can list everything and change nothing. Safest for an agent that only reads.'
              : 'Can do everything you can, including deleting lists.'}
          </p>

          <div className="mb-1.5 text-xs font-medium text-gray-500">Expires</div>
          <div role="radiogroup" aria-label="Expires" className="mb-3 flex gap-1.5">
            {EXPIRY_CHOICES.map(({ label, days }) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={expiryDays === days}
                onClick={() => setExpiryDays(days)}
                className={`${SEGMENT} ${
                  expiryDays === days
                    ? 'border-transparent bg-gray-200 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={name.trim() === '' || isCreating}
            className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isCreating ? 'Creating…' : 'Create token'}
          </button>
        </form>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
        )}

        <div className="mb-2 text-xs font-medium text-gray-500">
          Your tokens {tokens ? `(${tokens.length})` : ''}
        </div>

        {tokens === null ? (
          <p className="py-4 text-center text-[13px] text-gray-400">Loading…</p>
        ) : tokens.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-[13px] text-gray-400">
            No tokens yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((token) => (
              <li key={token.id} className="rounded-lg border border-gray-200 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="break-words text-[13px] font-medium text-gray-800">
                        {token.name}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          token.scope === 'write'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {token.scope === 'write' ? 'Read & write' : 'Read only'}
                      </span>
                      {isExpired(token) && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-gray-400">{token.prefix}…</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-gray-400">
                      Last used {formatStamp(token.lastUsedAt)} · Expires{' '}
                      {token.expiresAt ? formatStamp(token.expiresAt) : 'never'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revoke(token)}
                    className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SlideOverPanel>
  );
};
