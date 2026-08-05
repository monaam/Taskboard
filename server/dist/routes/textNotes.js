"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require auth
router.use(auth_1.authMiddleware);
// Get all text notes for user
router.get('/', async (req, res) => {
    const prisma = req.app.get('prisma');
    try {
        const textNotes = await prisma.textNote.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'asc' },
        });
        res.json(textNotes);
    }
    catch (error) {
        console.error('Get text notes error:', error);
        res.status(500).json({ error: 'Failed to get text notes' });
    }
});
// Create text note
router.post('/', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { text, x, y, fontSize, color } = req.body;
    try {
        const textNote = await prisma.textNote.create({
            data: {
                text: text || 'Text',
                x: x ?? 100,
                y: y ?? 100,
                fontSize: fontSize ?? 24,
                color: color || 'default',
                userId: req.userId,
            },
        });
        res.status(201).json(textNote);
    }
    catch (error) {
        console.error('Create text note error:', error);
        res.status(500).json({ error: 'Failed to create text note' });
    }
});
// Update text note
router.patch('/:id', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { id } = req.params;
    const { text, x, y, fontSize, color } = req.body;
    try {
        // Verify ownership
        const existing = await prisma.textNote.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Text note not found' });
        }
        const textNote = await prisma.textNote.update({
            where: { id },
            data: {
                ...(text !== undefined && { text }),
                ...(x !== undefined && { x }),
                ...(y !== undefined && { y }),
                ...(fontSize !== undefined && { fontSize }),
                ...(color !== undefined && { color }),
            },
        });
        res.json(textNote);
    }
    catch (error) {
        console.error('Update text note error:', error);
        res.status(500).json({ error: 'Failed to update text note' });
    }
});
// Delete text note
router.delete('/:id', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { id } = req.params;
    try {
        // Verify ownership
        const existing = await prisma.textNote.findFirst({
            where: { id, userId: req.userId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Text note not found' });
        }
        await prisma.textNote.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete text note error:', error);
        res.status(500).json({ error: 'Failed to delete text note' });
    }
});
exports.default = router;
//# sourceMappingURL=textNotes.js.map