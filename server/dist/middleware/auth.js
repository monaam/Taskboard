"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSession = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tokens_1 = require("../lib/tokens");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
/**
 * lastUsedAt is useful for spotting a token nobody uses any more, but writing it
 * on every request would add a write to every read. One minute of staleness is
 * plenty for that purpose and collapses a busy agent's traffic to one write a
 * minute.
 */
const LAST_USED_THROTTLE_MS = 60_000;
/**
 * Accepts either a session JWT or a personal access token, both as
 * `Authorization: Bearer <value>`. One header for both so an agent needs no
 * special casing, and the prefix decides which path to take without a database
 * round trip for the common web case.
 */
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const presented = authHeader.slice('Bearer '.length).trim();
    if ((0, tokens_1.looksLikeApiToken)(presented)) {
        const prisma = req.app.get('prisma');
        try {
            // One indexed lookup on the hash. The plaintext is never compared against
            // anything stored, because nothing stored is the plaintext.
            const token = await prisma.apiToken.findUnique({
                where: { tokenHash: (0, tokens_1.hashToken)(presented) },
                select: { id: true, userId: true, scope: true, expiresAt: true, lastUsedAt: true },
            });
            // Same message for "no such token" and "wrong token", so this cannot be
            // used to probe which tokens exist.
            if (!token)
                return res.status(401).json({ error: 'Invalid token' });
            if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
                return res.status(401).json({ error: 'Token expired' });
            }
            if (!(0, tokens_1.scopeAllowsMethod)(token.scope, req.method)) {
                return res
                    .status(403)
                    .json({ error: 'This token is read-only' });
            }
            if (!token.lastUsedAt ||
                Date.now() - token.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
                // Deliberately not awaited: it is bookkeeping, and the request should
                // not wait on it. Errors are swallowed for the same reason -- a failed
                // stamp must never fail the call it was describing.
                prisma.apiToken
                    .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
                    .catch(() => { });
            }
            req.userId = token.userId;
            req.authKind = 'token';
            return next();
        }
        catch (error) {
            console.error('API token auth error:', error);
            return res.status(500).json({ error: 'Failed to authenticate' });
        }
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(presented, JWT_SECRET);
        req.userId = decoded.userId;
        req.authKind = 'session';
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Blocks personal access tokens from managing personal access tokens.
 *
 * Without this, a leaked write token could mint itself a replacement that never
 * expires and revoke the ones you would have used to notice -- so the blast
 * radius of one leak would be permanent. Token management stays tied to knowing
 * the password.
 */
const requireSession = (req, res, next) => {
    if (req.authKind !== 'session') {
        return res.status(403).json({
            error: 'API tokens cannot manage API tokens. Sign in to the app to do that.',
        });
    }
    next();
};
exports.requireSession = requireSession;
//# sourceMappingURL=auth.js.map