import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

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
      orderBy: { createdAt: 'asc' },
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
  const { text, afterItemId } = req.body;

  try {
    // Verify ownership
    const checklist = await prisma.checklist.findFirst({
      where: { id, userId: req.userId },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
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
  const { text, completed } = req.body;

  try {
    // Verify ownership
    const checklist = await prisma.checklist.findFirst({
      where: { id: checklistId, userId: req.userId },
    });

    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }

    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(text !== undefined && { text }),
        ...(completed !== undefined && { completed }),
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
