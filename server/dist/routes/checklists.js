"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const access_1 = require("../lib/access");
const checklistView_1 = require("../lib/checklistView");
const shares_1 = __importDefault(require("./shares"));
const router = (0, express_1.Router)();
const STATUSES = ['todo', 'in_progress', 'done'];
const IMPACTS = ['low', 'medium', 'high'];
const EFFORTS = ['quick', 'moderate', 'heavy'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// All routes require auth
router.use(auth_1.authMiddleware);
// Get all checklists for user
router.get('/', async (req, res) => {
    const prisma = req.app.get('prisma');
    try {
        const rows = await prisma.checklist.findMany({
            where: (0, access_1.memberWhere)(req.userId),
            include: (0, checklistView_1.checklistInclude)(req.userId),
        });
        // Sorted here, not by the query: `order` is now per-viewer, so the column
        // the database could sort on is only the owner's version of it.
        res.json(rows.map((row) => (0, checklistView_1.toChecklistView)(row, req.userId)).sort(checklistView_1.byOrder));
    }
    catch (error) {
        console.error('Get checklists error:', error);
        res.status(500).json({ error: 'Failed to get checklists' });
    }
});
// Membership lives under the checklist it belongs to.
router.use('/:checklistId/shares', shares_1.default);
// Create checklist
router.post('/', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { title, x, y, color } = req.body;
    try {
        const checklist = await prisma.checklist.create({
            data: {
                title: title || 'New Checklist',
                x: x ?? 100,
                y: y ?? 100,
                color: color || 'default',
                userId: req.userId,
                items: {
                    create: [{ text: '', status: 'todo', order: 0 }],
                },
            },
            include: (0, checklistView_1.checklistInclude)(req.userId),
        });
        res.status(201).json((0, checklistView_1.toChecklistView)(checklist, req.userId));
    }
    catch (error) {
        console.error('Create checklist error:', error);
        res.status(500).json({ error: 'Failed to create checklist' });
    }
});
// Update checklist
router.patch('/:id', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { id } = req.params;
    const { title, x, y, color } = req.body;
    try {
        // Membership to reach the route at all; ownership is checked per field
        // below, because this one endpoint carries both kinds.
        const existing = await (0, access_1.findMemberChecklist)(prisma, id, req.userId);
        if (!existing) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        const isOwner = existing.userId === req.userId;
        // title and color belong to the list itself, so they are the owner's.
        // 403 rather than 404: the caller can plainly see this list, and pretending
        // it does not exist would be a worse explanation than refusing.
        if ((title !== undefined || color !== undefined) && !isOwner) {
            return res.status(403).json({ error: 'Only the owner can rename or recolour a shared list' });
        }
        if (title !== undefined || color !== undefined) {
            await prisma.checklist.update({
                where: { id },
                data: {
                    ...(title !== undefined && { title }),
                    ...(color !== undefined && { color }),
                },
            });
        }
        // Position is the caller's own, wherever that lives for them.
        if (x !== undefined || y !== undefined) {
            await (0, access_1.writePlacement)(prisma, id, req.userId, isOwner, { x, y });
        }
        const row = await prisma.checklist.findUnique({
            where: { id },
            include: (0, checklistView_1.checklistInclude)(req.userId),
        });
        res.json(row ? (0, checklistView_1.toChecklistView)(row, req.userId) : null);
    }
    catch (error) {
        console.error('Update checklist error:', error);
        res.status(500).json({ error: 'Failed to update checklist' });
    }
});
// Delete checklist
router.delete('/:id', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { id } = req.params;
    try {
        // Owner only. A member deleting a list for everyone is not a thing they
        // should be able to do by accident; they leave it instead.
        const existing = await prisma.checklist.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        await prisma.checklist.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete checklist error:', error);
        res.status(500).json({ error: 'Failed to delete checklist' });
    }
});
// Add item to checklist
router.post('/:id/items', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { id } = req.params;
    const { text, afterItemId, status, scheduledFor, dueDate, impact, effort, notes } = req.body;
    try {
        // Verify ownership
        // Any member, not just the owner: membership grants full access to the
        // contents. See lib/access.
        const checklist = await prisma.checklist.findFirst({
            where: { id, ...(0, access_1.memberWhere)(req.userId) },
            include: { items: { orderBy: { order: 'asc' } } },
        });
        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        // Must stay above the afterItemId shift below: that updateMany is already
        // committed when it runs, so a 400 after it would leave a permanent gap in
        // `order` with nothing to roll it back.
        // Accepted on create as well as on PATCH: an agent should be able to log
        // something it has already started without a second round trip, and a
        // field the update route takes but the create route silently drops is the
        // kind of asymmetry nobody reads the docs carefully enough to expect.
        if (status !== undefined && !STATUSES.includes(status)) {
            return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
        }
        if (impact !== undefined && impact !== null && !IMPACTS.includes(impact)) {
            return res.status(400).json({ error: `impact must be one of ${IMPACTS.join(', ')} or null` });
        }
        if (effort !== undefined && effort !== null && !EFFORTS.includes(effort)) {
            return res.status(400).json({ error: `effort must be one of ${EFFORTS.join(', ')} or null` });
        }
        for (const [key, value] of [['scheduledFor', scheduledFor], ['dueDate', dueDate]]) {
            if (value !== undefined && value !== null && !DATE_RE.test(value)) {
                return res.status(400).json({ error: `${key} must be a YYYY-MM-DD string or null` });
            }
        }
        let order = checklist.items.length;
        if (afterItemId) {
            const afterItem = checklist.items.find(i => i.id === afterItemId);
            if (afterItem) {
                order = afterItem.order + 1;
                // Shift items after
                await prisma.checklistItem.updateMany({
                    where: {
                        checklistId: id,
                        order: { gte: order },
                    },
                    data: { order: { increment: 1 } },
                });
            }
        }
        const item = await prisma.checklistItem.create({
            data: {
                text: text || '',
                status: status ?? 'todo',
                order,
                checklistId: id,
                ...(scheduledFor !== undefined && { scheduledFor }),
                ...(dueDate !== undefined && { dueDate }),
                ...(impact !== undefined && { impact }),
                ...(effort !== undefined && { effort }),
                ...(notes !== undefined && { notes }),
            },
        });
        res.status(201).json(item);
    }
    catch (error) {
        console.error('Add item error:', error);
        res.status(500).json({ error: 'Failed to add item' });
    }
});
// Update item
router.patch('/:checklistId/items/:itemId', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { checklistId, itemId } = req.params;
    const { text, status, scheduledFor, dueDate, impact, effort, notes } = req.body;
    try {
        // Verify ownership
        const checklist = await (0, access_1.findMemberChecklist)(prisma, checklistId, req.userId);
        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        // Never null, unlike impact/effort: every item has a status, and 'todo' is
        // the cleared state.
        if (status !== undefined && !STATUSES.includes(status)) {
            return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
        }
        if (impact !== undefined && impact !== null && !IMPACTS.includes(impact)) {
            return res.status(400).json({ error: `impact must be one of ${IMPACTS.join(', ')} or null` });
        }
        if (effort !== undefined && effort !== null && !EFFORTS.includes(effort)) {
            return res.status(400).json({ error: `effort must be one of ${EFFORTS.join(', ')} or null` });
        }
        for (const [key, value] of [['scheduledFor', scheduledFor], ['dueDate', dueDate]]) {
            if (value !== undefined && value !== null && !DATE_RE.test(value)) {
                return res.status(400).json({ error: `${key} must be a YYYY-MM-DD string or null` });
            }
        }
        // Scoped on BOTH ids, never itemId alone. Owning the checklist in the URL
        // says nothing about who owns the item: passing your own checklist id with
        // someone else's item id used to pass the ownership check above and then
        // operate on their row.
        const { count } = await prisma.checklistItem.updateMany({
            where: { id: itemId, checklistId },
            data: {
                ...(text !== undefined && { text }),
                ...(status !== undefined && { status }),
                ...(scheduledFor !== undefined && { scheduledFor }),
                ...(dueDate !== undefined && { dueDate }),
                ...(impact !== undefined && { impact }),
                ...(effort !== undefined && { effort }),
                ...(notes !== undefined && { notes }),
            },
        });
        if (count === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        // updateMany returns a count, not the row, so the response needs a read.
        const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
        res.json(item);
    }
    catch (error) {
        console.error('Update item error:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});
// Delete item
router.delete('/:checklistId/items/:itemId', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { checklistId, itemId } = req.params;
    try {
        // Verify ownership
        const checklist = await (0, access_1.findMemberChecklist)(prisma, checklistId, req.userId);
        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        // Scoped on BOTH ids, never itemId alone. Owning the checklist in the URL
        // says nothing about who owns the item: passing your own checklist id with
        // someone else's item id used to pass the ownership check above and then
        // operate on their row.
        const { count } = await prisma.checklistItem.deleteMany({
            where: { id: itemId, checklistId },
        });
        if (count === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});
// Reorder items
router.post('/:id/reorder', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { id } = req.params;
    const { itemIds } = req.body; // Array of item IDs in new order
    try {
        // Verify ownership
        const checklist = await (0, access_1.findMemberChecklist)(prisma, id, req.userId);
        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        if (!Array.isArray(itemIds)) {
            return res.status(400).json({ error: 'itemIds must be an array' });
        }
        // Every id must belong to this checklist. One query rather than a check
        // per item, and it closes the same hole as the routes above: the
        // ownership check on the checklist said nothing about these ids.
        const owned = await prisma.checklistItem.findMany({
            where: { id: { in: itemIds }, checklistId: id },
            select: { id: true },
        });
        if (owned.length !== itemIds.length) {
            return res.status(404).json({ error: 'Item not found' });
        }
        // Update order for each item
        await Promise.all(itemIds.map((itemId, index) => prisma.checklistItem.update({
            where: { id: itemId },
            data: { order: index },
        })));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Reorder error:', error);
        res.status(500).json({ error: 'Failed to reorder items' });
    }
});
// Move item between checklists
router.post('/move-item', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { sourceChecklistId, targetChecklistId, itemId, targetIndex } = req.body;
    try {
        // Verify ownership of both checklists
        // Membership on both, ownership on neither: moving an item between a list
        // you own and one shared with you is ordinary use.
        const sourceChecklist = await (0, access_1.findMemberChecklist)(prisma, sourceChecklistId, req.userId);
        const targetChecklist = await prisma.checklist.findFirst({
            where: { id: targetChecklistId, ...(0, access_1.memberWhere)(req.userId) },
            include: { items: { orderBy: { order: 'asc' } } },
        });
        if (!sourceChecklist || !targetChecklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        // The item must actually be in the source checklist. Checked BEFORE the
        // shift below, which is already committed by the time the move runs: a
        // move that fails afterwards would leave a permanent gap in `order`.
        //
        // Without this, owning any two checklists was enough to pull someone
        // else's item into your own list -- and then read it.
        const item = await prisma.checklistItem.findFirst({
            where: { id: itemId, checklistId: sourceChecklistId },
            select: { id: true },
        });
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        // Shift items in target checklist
        await prisma.checklistItem.updateMany({
            where: {
                checklistId: targetChecklistId,
                order: { gte: targetIndex },
            },
            data: { order: { increment: 1 } },
        });
        // Move item
        await prisma.checklistItem.update({
            where: { id: itemId },
            data: {
                checklistId: targetChecklistId,
                order: targetIndex,
            },
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Move item error:', error);
        res.status(500).json({ error: 'Failed to move item' });
    }
});
// Reorder checklists
router.post('/reorder-checklists', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { checklistIds } = req.body; // Array of checklist IDs in new order
    try {
        if (!Array.isArray(checklistIds)) {
            return res.status(400).json({ error: 'checklistIds must be an array' });
        }
        // Every list must be reachable -- owned or shared.
        const checklists = await prisma.checklist.findMany({
            where: { id: { in: checklistIds }, ...(0, access_1.memberWhere)(req.userId) },
            select: { id: true, userId: true },
        });
        if (checklists.length !== checklistIds.length) {
            return res.status(404).json({ error: 'One or more checklists not found' });
        }
        const ownedIds = new Set(checklists.filter((c) => c.userId === req.userId).map((c) => c.id));
        // Ordering is per-viewer, so this writes the caller's order and leaves
        // every other member's alone.
        await Promise.all(checklistIds.map((checklistId, index) => (0, access_1.writePlacement)(prisma, checklistId, req.userId, ownedIds.has(checklistId), {
            order: index,
        })));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Reorder checklists error:', error);
        res.status(500).json({ error: 'Failed to reorder checklists' });
    }
});
// Bulk-set checklist positions (auto-arrange)
router.post('/positions', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { positions } = req.body; // Array of { id, x, y }
    if (!Array.isArray(positions)) {
        return res.status(400).json({ error: 'positions must be an array' });
    }
    // x and y are non-nullable Floats. A NaN serialises to JSON null, which would
    // otherwise reach Prisma and blow up mid-transaction.
    const invalid = positions.some((p) => !p || typeof p.id !== 'string' || !Number.isFinite(p.x) || !Number.isFinite(p.y));
    if (invalid) {
        return res.status(400).json({ error: 'Each position needs an id and finite x and y' });
    }
    try {
        const ids = positions.map((p) => p.id);
        const reachable = await prisma.checklist.findMany({
            where: { id: { in: ids }, ...(0, access_1.memberWhere)(req.userId) },
            select: { id: true, userId: true },
        });
        if (reachable.length !== ids.length) {
            return res.status(404).json({ error: 'One or more checklists not found' });
        }
        const ownedIds = new Set(reachable.filter((c) => c.userId === req.userId).map((c) => c.id));
        // Still transactional: a partial write would leave a tidy screen and a
        // scrambled database. writePlacement sends each position to the caller's
        // own storage, so auto-arrange rearranges nobody else's board.
        await prisma.$transaction(async (tx) => {
            for (const p of positions) {
                await (0, access_1.writePlacement)(tx, p.id, req.userId, ownedIds.has(p.id), {
                    x: p.x,
                    y: p.y,
                });
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Set positions error:', error);
        res.status(500).json({ error: 'Failed to set positions' });
    }
});
// Bulk operations
router.post('/:id/select-all', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { id } = req.params;
    try {
        const checklist = await (0, access_1.findMemberChecklist)(prisma, id, req.userId);
        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        await prisma.checklistItem.updateMany({
            where: { checklistId: id },
            data: { status: 'done' },
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to select all' });
    }
});
router.post('/:id/deselect-all', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { id } = req.params;
    try {
        const checklist = await (0, access_1.findMemberChecklist)(prisma, id, req.userId);
        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        await prisma.checklistItem.updateMany({
            where: { checklistId: id, status: 'done' },
            data: { status: 'todo' },
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to deselect all' });
    }
});
router.delete('/:id/completed', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { id } = req.params;
    try {
        const checklist = await (0, access_1.findMemberChecklist)(prisma, id, req.userId);
        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        await prisma.checklistItem.deleteMany({
            where: { checklistId: id, status: 'done' },
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete completed' });
    }
});
exports.default = router;
//# sourceMappingURL=checklists.js.map