/**
 * Membership of a checklist.
 *
 * Mounted under /api/checklists/:checklistId/shares, so the checklist router
 * passes the id through. Every route resolves access itself rather than
 * trusting the mount -- the parent router's checks do not run for these paths.
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=shares.d.ts.map