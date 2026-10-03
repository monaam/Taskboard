import { Request, Response, NextFunction } from 'express';
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
 * Accepts either a session JWT or a personal access token, both as
 * `Authorization: Bearer <value>`. One header for both so an agent needs no
 * special casing, and the prefix decides which path to take without a database
 * round trip for the common web case.
 */
export declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Blocks personal access tokens from managing personal access tokens.
 *
 * Without this, a leaked write token could mint itself a replacement that never
 * expires and revoke the ones you would have used to notice -- so the blast
 * radius of one leak would be permanent. Token management stays tied to knowing
 * the password.
 */
export declare const requireSession: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map