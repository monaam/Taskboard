/**
 * Personal access tokens for agents and scripts.
 *
 * The plaintext is returned once, at creation, and never stored: only its
 * SHA-256 lives in the database, so a dump of the table cannot be replayed
 * against the API.
 */
/** Marks a token as ours so the auth middleware can route on it without a DB hit. */
export declare const TOKEN_PREFIX = "tbp_";
export declare const SCOPES: readonly ["read", "write"];
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
export declare const createToken: () => NewToken;
/** Hashes the FULL token including the prefix, so the stored value is never a
 *  hash of just the secret part. */
export declare const hashToken: (plaintext: string) => string;
export declare const looksLikeApiToken: (value: string) => boolean;
export declare const isScope: (value: unknown) => value is TokenScope;
export declare const scopeAllowsMethod: (scope: string, method: string) => boolean;
/** null = never expires. */
export declare const expiryFromDays: (days: unknown) => Date | null;
//# sourceMappingURL=tokens.d.ts.map