import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, requireSession } from '../middleware/auth';
import { createToken, expiryFromDays, isScope, SCOPES } from '../lib/tokens';

const router = Router();

// Every route here manages credentials, so none of them may be driven by a
// credential -- see requireSession.
router.use(requireSession);

const MAX_NAME = 60;

/** What the client may see. tokenHash never appears; `prefix` is the only part
 *  of the token that survives creation. */
const PUBLIC_FIELDS = {
  id: true,
  name: true,
  prefix: true,
  scope: true,
  expiresAt: true,
  lastUsedAt: true,
  createdAt: true,
} as const;

// List
router.get('/', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  try {
    const tokens = await prisma.apiToken.findMany({
      where: { userId: req.userId },
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: 'desc' },
    });
    res.json(tokens);
  } catch (error) {
    console.error('List tokens error:', error);
    res.status(500).json({ error: 'Failed to list tokens' });
  }
});

// Create. The only response that ever contains the plaintext.
router.post('/', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  const { name, scope, expiresInDays } = req.body;

  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (trimmed === '') {
    return res.status(400).json({ error: 'name is required' });
  }
  if (trimmed.length > MAX_NAME) {
    return res.status(400).json({ error: `name must be ${MAX_NAME} characters or fewer` });
  }
  if (!isScope(scope)) {
    return res.status(400).json({ error: `scope must be one of ${SCOPES.join(', ')}` });
  }

  try {
    const { plaintext, tokenHash, prefix } = createToken();
    const token = await prisma.apiToken.create({
      data: {
        name: trimmed,
        tokenHash,
        prefix,
        scope,
        // Anything unparseable becomes null rather than a 400: the field is
        // optional, and "never expires" is a legitimate answer.
        expiresAt: expiryFromDays(expiresInDays),
        userId: req.userId!,
      },
      select: PUBLIC_FIELDS,
    });

    // 201 with the plaintext, once. There is no endpoint that can return it
    // again, because nothing stores it.
    res.status(201).json({ ...token, token: plaintext });
  } catch (error) {
    console.error('Create token error:', error);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

// Revoke. A hard delete: a revoked-but-listed token is a state the UI would
// have to explain, and the row carries no history worth keeping.
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const prisma: PrismaClient = req.app.get('prisma');
  try {
    // deleteMany, not delete: scoping on userId in the same statement means
    // another user's id cannot be deleted, and a missing row is not an
    // exception to catch.
    const { count } = await prisma.apiToken.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    if (count === 0) return res.status(404).json({ error: 'Token not found' });
    res.status(204).send();
  } catch (error) {
    console.error('Revoke token error:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

export default router;
