import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const IMPACTS = ['low', 'medium', 'high'];
const EFFORTS = ['quick', 'moderate', 'heavy'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// All routes require auth
router.use(authMiddleware);

// Get all checklists for user
router.get('/', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');

  try {
    const checklists = await prisma.checklist.findMany({
      where: { userId: req.userId },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json(checklists);
  } catch (error) {
    console.error('Get checklists error:', error);
    res.status(500).json({ error: 'Failed to get checklists' });
  }
});

// Create checklist
router.post('/', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { title, x, y, color } = req.body;

  try {
    const checklist = await prisma.checklist.create({
      data: {
        title: title || 'New Checklist',
        x: x ?? 100,
        y: y ?? 100,
        color: color || 'default',
        userId: req.userId!,
        items: {
          create: [{ text: '', completed: false, order: 0 }],
        },
      },
      include: { items: true },
    });

    res.status(201).json(checklist);
  } catch (error) {
    console.error('Create checklist error:', error);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
});

// Update checklist
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const { title, x, y, color } = req.body;

  try {
    // Verify ownership
    const existing = await prisma.checklist.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    const checklist = await prisma.checklist.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
        ...(color !== undefined && { color }),
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    res.json(checklist);
  } catch (error) {
    console.error('Update checklist error:', error);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// Delete checklist
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    // Verify ownership
    const existing = await prisma.checklist.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    await prisma.checklist.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete checklist error:', error);
    res.status(500).json({ error: 'Failed to delete checklist' });
  }
});

// Add item to checklist
router.post('/:id/items', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const { text, afterItemId, scheduledFor, dueDate, impact, effort, notes } = req.body;

  try {
    // Verify ownership
    const checklist = await prisma.checklist.findFirst({
      where: { id, userId: req.userId },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    // Must stay above the afterItemId shift below: that updateMany is already
    // committed when it runs, so a 400 after it would leave a permanent gap in
    // `order` with nothing to roll it back.
    if (impact !== undefined && impact !== null && !IMPACTS.includes(impact)) {
      return res.status(400).json({ error: `impact must be one of ${IMPACTS.join(', ')} or null` });
    }

    if (effort !== undefined && effort !== null && !EFFORTS.includes(effort)) {
      return res.status(400).json({ error: `effort must be one of ${EFFORTS.join(', ')} or null` });
    }

    for (const [key, value] of [['scheduledFor', scheduledFor], ['dueDate', dueDate]] as const) {
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
        completed: false,
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
  } catch (error) {
    console.error('Add item error:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update item
router.patch('/:checklistId/items/:itemId', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { checklistId, itemId } = req.params;
  const { text, completed, scheduledFor, dueDate, impact, effort, notes } = req.body;

  try {
    // Verify ownership
    const checklist = await prisma.checklist.findFirst({
      where: { id: checklistId, userId: req.userId },
    });

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    if (impact !== undefined && impact !== null && !IMPACTS.includes(impact)) {
      return res.status(400).json({ error: `impact must be one of ${IMPACTS.join(', ')} or null` });
    }

    if (effort !== undefined && effort !== null && !EFFORTS.includes(effort)) {
      return res.status(400).json({ error: `effort must be one of ${EFFORTS.join(', ')} or null` });
    }

    for (const [key, value] of [['scheduledFor', scheduledFor], ['dueDate', dueDate]] as const) {
      if (value !== undefined && value !== null && !DATE_RE.test(value)) {
        return res.status(400).json({ error: `${key} must be a YYYY-MM-DD string or null` });
      }
    }

    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(text !== undefined && { text }),
        ...(completed !== undefined && { completed }),
        ...(scheduledFor !== undefined && { scheduledFor }),
        ...(dueDate !== undefined && { dueDate }),
        ...(impact !== undefined && { impact }),
        ...(effort !== undefined && { effort }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json(item);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
router.delete('/:checklistId/items/:itemId', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { checklistId, itemId } = req.params;

  try {
    // Verify ownership
    const checklist = await prisma.checklist.findFirst({
      where: { id: checklistId, userId: req.userId },
    });

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    await prisma.checklistItem.delete({ where: { id: itemId } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Reorder items
router.post('/:id/reorder', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;
  const { itemIds } = req.body; // Array of item IDs in new order

  try {
    // Verify ownership
    const checklist = await prisma.checklist.findFirst({
      where: { id, userId: req.userId },
    });

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    // Update order for each item
    await Promise.all(
      itemIds.map((itemId: string, index: number) =>
        prisma.checklistItem.update({
          where: { id: itemId },
          data: { order: index },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({ error: 'Failed to reorder items' });
  }
});

// Move item between checklists
router.post('/move-item', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { sourceChecklistId, targetChecklistId, itemId, targetIndex } = req.body;

  try {
    // Verify ownership of both checklists
    const sourceChecklist = await prisma.checklist.findFirst({
      where: { id: sourceChecklistId, userId: req.userId },
    });
    const targetChecklist = await prisma.checklist.findFirst({
      where: { id: targetChecklistId, userId: req.userId },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    if (!sourceChecklist || !targetChecklist) {
      return res.status(404).json({ error: 'Checklist not found' });
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
  } catch (error) {
    console.error('Move item error:', error);
    res.status(500).json({ error: 'Failed to move item' });
  }
});

// Reorder checklists
router.post('/reorder-checklists', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { checklistIds } = req.body; // Array of checklist IDs in new order

  try {
    // Verify ownership of all checklists
    const checklists = await prisma.checklist.findMany({
      where: {
        id: { in: checklistIds },
        userId: req.userId
      },
    });

    if (checklists.length !== checklistIds.length) {
      return res.status(404).json({ error: 'One or more checklists not found' });
    }

    // Update order for each checklist
    await Promise.all(
      checklistIds.map((checklistId: string, index: number) =>
        prisma.checklist.update({
          where: { id: checklistId },
          data: { order: index },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder checklists error:', error);
    res.status(500).json({ error: 'Failed to reorder checklists' });
  }
});

// Bulk-set checklist positions (auto-arrange)
router.post('/positions', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { positions } = req.body; // Array of { id, x, y }

  if (!Array.isArray(positions)) {
    return res.status(400).json({ error: 'positions must be an array' });
  }

  // x and y are non-nullable Floats. A NaN serialises to JSON null, which would
  // otherwise reach Prisma and blow up mid-transaction.
  const invalid = positions.some(
    (p) => !p || typeof p.id !== 'string' || !Number.isFinite(p.x) || !Number.isFinite(p.y)
  );
  if (invalid) {
    return res.status(400).json({ error: 'Each position needs an id and finite x and y' });
  }

  try {
    const ids = positions.map((p: { id: string }) => p.id);
    const owned = await prisma.checklist.findMany({
      where: { id: { in: ids }, userId: req.userId },
    });

    if (owned.length !== ids.length) {
      return res.status(404).json({ error: 'One or more checklists not found' });
    }

    // Transactional so the board can never persist half arranged — a partial
    // write would leave a tidy screen and a scrambled database.
    await prisma.$transaction(
      positions.map((p: { id: string; x: number; y: number }) =>
        prisma.checklist.update({
          where: { id: p.id },
          data: { x: p.x, y: p.y },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Set positions error:', error);
    res.status(500).json({ error: 'Failed to set positions' });
  }
});

// Bulk operations
router.post('/:id/select-all', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const checklist = await prisma.checklist.findFirst({
      where: { id, userId: req.userId },
    });

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    await prisma.checklistItem.updateMany({
      where: { checklistId: id },
      data: { completed: true },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to select all' });
  }
});

router.post('/:id/deselect-all', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const checklist = await prisma.checklist.findFirst({
      where: { id, userId: req.userId },
    });

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    await prisma.checklistItem.updateMany({
      where: { checklistId: id },
      data: { completed: false },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deselect all' });
  }
});

router.delete('/:id/completed', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { id } = req.params;

  try {
    const checklist = await prisma.checklist.findFirst({
      where: { id, userId: req.userId },
    });

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    await prisma.checklistItem.deleteMany({
      where: { checklistId: id, completed: true },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete completed' });
  }
});

export default router;
