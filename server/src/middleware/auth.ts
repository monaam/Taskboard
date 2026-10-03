import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { hashToken, looksLikeApiToken, scopeAllowsMethod } from '../lib/tokens';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  userId?: string;
  /**
   * How the caller authenticated. 'session' is the web app's JWT; 'token' is a
   * personal access token. Anything that can escalate privilege -- minting or
   * revoking tokens -- must require 'session'; see requireSession.
   */
  authKind?: 'session' | 'token';
}

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
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const presented = authHeader.slice('Bearer '.length).trim();

  if (looksLikeApiToken(presented)) {
    const prisma: PrismaClient = req.app.get('prisma');
    try {
      // One indexed lookup on the hash. The plaintext is never compared against
      // anything stored, because nothing stored is the plaintext.
      const token = await prisma.apiToken.findUnique({
        where: { tokenHash: hashToken(presented) },
        select: { id: true, userId: true, scope: true, expiresAt: true, lastUsedAt: true },
      });

      // Same message for "no such token" and "wrong token", so this cannot be
      // used to probe which tokens exist.
      if (!token) return res.status(401).json({ error: 'Invalid token' });

      if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
        return res.status(401).json({ error: 'Token expired' });
      }

      if (!scopeAllowsMethod(token.scope, req.method)) {
        return res
          .status(403)
          .json({ error: 'This token is read-only' });
      }

      if (
        !token.lastUsedAt ||
        Date.now() - token.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS
      ) {
        // Deliberately not awaited: it is bookkeeping, and the request should
        // not wait on it. Errors are swallowed for the same reason -- a failed
        // stamp must never fail the call it was describing.
        prisma.apiToken
          .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
          .catch(() => {});
      }

      req.userId = token.userId;
      req.authKind = 'token';
      return next();
    } catch (error) {
      console.error('API token auth error:', error);
      return res.status(500).json({ error: 'Failed to authenticate' });
    }
  }

  try {
    const decoded = jwt.verify(presented, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    req.authKind = 'session';
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Blocks personal access tokens from managing personal access tokens.
 *
 * Without this, a leaked write token could mint itself a replacement that never
 * expires and revoke the ones you would have used to notice -- so the blast
 * radius of one leak would be permanent. Token management stays tied to knowing
 * the password.
 */
export const requireSession = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.authKind !== 'session') {
    return res.status(403).json({
      error: 'API tokens cannot manage API tokens. Sign in to the app to do that.',
    });
  }
  next();
};
