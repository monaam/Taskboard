"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const access_1 = require("../lib/access");
/**
 * Membership of a checklist.
 *
 * Mounted under /api/checklists/:checklistId/shares, so the checklist router
 * passes the id through. Every route resolves access itself rather than
 * trusting the mount -- the parent router's checks do not run for these paths.
 */
const router = (0, express_1.Router)({ mergeParams: true });
const member = (s) => ({
    id: s.user.id,
    username: s.user.username,
    sharedAt: s.createdAt,
});
// Who is on this list. Any member may see this: knowing who else can edit a
// list you are editing is the point. Only changing it is reserved.
router.get('/', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { checklistId } = req.params;
    try {
        const checklist = await (0, access_1.findMemberChecklist)(prisma, checklistId, req.userId);
        if (!checklist)
            return res.status(404).json({ error: 'Checklist not found' });
        const shares = await prisma.checklistShare.findMany({
            where: { checklistId },
            select: { createdAt: true, user: { select: { id: true, username: true } } },
            orderBy: { createdAt: 'asc' },
        });
        res.json({
            isOwner: checklist.userId === req.userId,
            members: shares.map(member),
        });
    }
    catch (error) {
        console.error('List shares error:', error);
        res.status(500).json({ error: 'Failed to list members' });
    }
});
// Add a member, by username. Owner only.
router.post('/', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { checklistId } = req.params;
    const { username } = req.body;
    const trimmed = typeof username === 'string' ? username.trim() : '';
    if (trimmed === '')
        return res.status(400).json({ error: 'username is required' });
    try {
        // 404 for a list you do not own, the same as one that does not exist: a
        // non-owner must not be able to tell the difference.
        const checklist = await (0, access_1.findOwnedChecklist)(prisma, checklistId, req.userId);
        if (!checklist)
            return res.status(404).json({ error: 'Checklist not found' });
        const target = await prisma.user.findUnique({
            where: { username: trimmed },
            select: { id: true, username: true },
        });
        // Says plainly that there is no such account. This leaks whether a
        // username exists, which a public sign-up form leaks anyway -- and the
        // alternative is a share that silently does nothing.
        if (!target)
            return res.status(404).json({ error: `No account called "${trimmed}"` });
        if (target.id === req.userId) {
            return res.status(400).json({ error: 'You already own this list' });
        }
        // Upsert, so sharing twice is not an error and not a duplicate row.
        const share = await prisma.checklistShare.upsert({
            where: { checklistId_userId: { checklistId, userId: target.id } },
            create: { checklistId, userId: target.id },
            update: {},
            select: { createdAt: true, user: { select: { id: true, username: true } } },
        });
        res.status(201).json(member(share));
    }
    catch (error) {
        console.error('Add share error:', error);
        res.status(500).json({ error: 'Failed to share' });
    }
});
/**
 * Leave a list shared with you.
 *
 * Declared before /:userId so 'me' is not read as a user id. Members need this
 * because deleting the list is the owner's alone -- without it, a share could
 * never be got rid of by the person who received it.
 */
router.delete('/me', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { checklistId } = req.params;
    try {
        const { count } = await prisma.checklistShare.deleteMany({
            where: { checklistId, userId: req.userId },
        });
        if (count === 0)
            return res.status(404).json({ error: 'You are not a member of this list' });
        res.status(204).send();
    }
    catch (error) {
        console.error('Leave share error:', error);
        res.status(500).json({ error: 'Failed to leave' });
    }
});
// Remove a member. Owner only.
router.delete('/:userId', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { checklistId, userId } = req.params;
    try {
        const checklist = await (0, access_1.findOwnedChecklist)(prisma, checklistId, req.userId);
        if (!checklist)
            return res.status(404).json({ error: 'Checklist not found' });
        const { count } = await prisma.checklistShare.deleteMany({ where: { checklistId, userId } });
        if (count === 0)
            return res.status(404).json({ error: 'Not a member of this list' });
        // The member's placement row is theirs and has no meaning once access is
        // gone; leaving it behind would restore their old position if re-shared,
        // which is harmless but untidy.
        await prisma.checklistPlacement.deleteMany({ where: { checklistId, userId } });
        res.status(204).send();
    }
    catch (error) {
        console.error('Remove share error:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});
exports.default = router;
//# sourceMappingURL=shares.js.map