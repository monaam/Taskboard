import crypto from 'crypto';

/**
 * Personal access tokens for agents and scripts.
 *
 * The plaintext is returned once, at creation, and never stored: only its
 * SHA-256 lives in the database, so a dump of the table cannot be replayed
 * against the API.
 */

/** Marks a token as ours so the auth middleware can route on it without a DB hit. */
export const TOKEN_PREFIX = 'tbp_';

/** How much of the token the UI may show. Enough to tell two apart, far too
 *  little to guess the rest: the secret is 256 bits. */
const DISPLAY_CHARS = TOKEN_PREFIX.length + 6;

export const SCOPES = ['read', 'write'] as const;
export type TokenScope = (typeof SCOPES)[number];

export type NewToken = {
  /** Shown to the user once. Never persisted. */
  plaintext: string;
  tokenHash: string;
  prefix: string;
};

/**
 * base64url, not hex: same 256 bits of entropy in 43 characters instead of 64,
 * and it survives being pasted into a URL or a shell without quoting.
 */
export const createToken = (): NewToken => {
  const plaintext = TOKEN_PREFIX + crypto.randomBytes(32).toString('base64url');
  return {
    plaintext,
    tokenHash: hashToken(plaintext),
    prefix: plaintext.slice(0, DISPLAY_CHARS),
  };
};

/** Hashes the FULL token including the prefix, so the stored value is never a
 *  hash of just the secret part. */
export const hashToken = (plaintext: string): string =>
  crypto.createHash('sha256').update(plaintext).digest('hex');

export const looksLikeApiToken = (value: string): boolean => value.startsWith(TOKEN_PREFIX);

export const isScope = (value: unknown): value is TokenScope =>
  typeof value === 'string' && (SCOPES as readonly string[]).includes(value);

/**
 * A read token may only make safe requests. Decided by HTTP method rather than
 * by a per-route list: every mutation in this API is a POST, PATCH or DELETE,
 * so a route added later is restricted by default instead of being forgotten.
 *
 * HEAD and OPTIONS ride along with GET -- CORS preflight is an OPTIONS.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const scopeAllowsMethod = (scope: string, method: string): boolean =>
  scope === 'write' || SAFE_METHODS.has(method.toUpperCase());

/** null = never expires. */
export const expiryFromDays = (days: unknown): Date | null => {
  if (days === null || days === undefined || days === '' || days === 'never') return null;
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0 || n > 3650) return null;
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
};
