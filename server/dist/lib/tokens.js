"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.expiryFromDays = exports.scopeAllowsMethod = exports.isScope = exports.looksLikeApiToken = exports.hashToken = exports.createToken = exports.SCOPES = exports.TOKEN_PREFIX = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Personal access tokens for agents and scripts.
 *
 * The plaintext is returned once, at creation, and never stored: only its
 * SHA-256 lives in the database, so a dump of the table cannot be replayed
 * against the API.
 */
/** Marks a token as ours so the auth middleware can route on it without a DB hit. */
exports.TOKEN_PREFIX = 'tbp_';
/** How much of the token the UI may show. Enough to tell two apart, far too
 *  little to guess the rest: the secret is 256 bits. */
const DISPLAY_CHARS = exports.TOKEN_PREFIX.length + 6;
exports.SCOPES = ['read', 'write'];
/**
 * base64url, not hex: same 256 bits of entropy in 43 characters instead of 64,
 * and it survives being pasted into a URL or a shell without quoting.
 */
const createToken = () => {
    const plaintext = exports.TOKEN_PREFIX + crypto_1.default.randomBytes(32).toString('base64url');
    return {
        plaintext,
        tokenHash: (0, exports.hashToken)(plaintext),
        prefix: plaintext.slice(0, DISPLAY_CHARS),
    };
};
exports.createToken = createToken;
/** Hashes the FULL token including the prefix, so the stored value is never a
 *  hash of just the secret part. */
const hashToken = (plaintext) => crypto_1.default.createHash('sha256').update(plaintext).digest('hex');
exports.hashToken = hashToken;
const looksLikeApiToken = (value) => value.startsWith(exports.TOKEN_PREFIX);
exports.looksLikeApiToken = looksLikeApiToken;
const isScope = (value) => typeof value === 'string' && exports.SCOPES.includes(value);
exports.isScope = isScope;
/**
 * A read token may only make safe requests. Decided by HTTP method rather than
 * by a per-route list: every mutation in this API is a POST, PATCH or DELETE,
 * so a route added later is restricted by default instead of being forgotten.
 *
 * HEAD and OPTIONS ride along with GET -- CORS preflight is an OPTIONS.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const scopeAllowsMethod = (scope, method) => scope === 'write' || SAFE_METHODS.has(method.toUpperCase());
exports.scopeAllowsMethod = scopeAllowsMethod;
/** null = never expires. */
const expiryFromDays = (days) => {
    if (days === null || days === undefined || days === '' || days === 'never')
        return null;
    const n = Number(days);
    if (!Number.isFinite(n) || n <= 0 || n > 3650)
        return null;
    return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
};
exports.expiryFromDays = expiryFromDays;
//# sourceMappingURL=tokens.js.map