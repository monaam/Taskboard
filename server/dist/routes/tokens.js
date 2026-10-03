"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const tokens_1 = require("../lib/tokens");
const router = (0, express_1.Router)();
// Every route here manages credentials, so none of them may be driven by a
// credential -- see requireSession.
router.use(auth_1.requireSession);
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
};
// List
router.get('/', async (req, res) => {
    const prisma = req.app.get('prisma');
    try {
        const tokens = await prisma.apiToken.findMany({
            where: { userId: req.userId },
            select: PUBLIC_FIELDS,
            orderBy: { createdAt: 'desc' },
        });
        res.json(tokens);
    }
    catch (error) {
        console.error('List tokens error:', error);
        res.status(500).json({ error: 'Failed to list tokens' });
    }
});
// Create. The only response that ever contains the plaintext.
router.post('/', async (req, res) => {
    const prisma = req.app.get('prisma');
    const { name, scope, expiresInDays } = req.body;
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (trimmed === '') {
        return res.status(400).json({ error: 'name is required' });
    }
    if (trimmed.length > MAX_NAME) {
        return res.status(400).json({ error: `name must be ${MAX_NAME} characters or fewer` });
    }
    if (!(0, tokens_1.isScope)(scope)) {
        return res.status(400).json({ error: `scope must be one of ${tokens_1.SCOPES.join(', ')}` });
    }
    try {
        const { plaintext, tokenHash, prefix } = (0, tokens_1.createToken)();
        const token = await prisma.apiToken.create({
            data: {
                name: trimmed,
                tokenHash,
                prefix,
                scope,
                // Anything unparseable becomes null rather than a 400: the field is
                // optional, and "never expires" is a legitimate answer.
                expiresAt: (0, tokens_1.expiryFromDays)(expiresInDays),
                userId: req.userId,
            },
            select: PUBLIC_FIELDS,
        });
        // 201 with the plaintext, once. There is no endpoint that can return it
        // again, because nothing stores it.
        res.status(201).json({ ...token, token: plaintext });
    }
    catch (error) {
        console.error('Create token error:', error);
        res.status(500).json({ error: 'Failed to create token' });
    }
});
// Revoke. A hard delete: a revoked-but-listed token is a state the UI would
// have to explain, and the row carries no history worth keeping.
router.delete('/:id', async (req, res) => {
    const prisma = req.app.get('prisma');
    try {
        // deleteMany, not delete: scoping on userId in the same statement means
        // another user's id cannot be deleted, and a missing row is not an
        // exception to catch.
        const { count } = await prisma.apiToken.deleteMany({
            where: { id: req.params.id, userId: req.userId },
        });
        if (count === 0)
            return res.status(404).json({ error: 'Token not found' });
        res.status(204).send();
    }
    catch (error) {
        console.error('Revoke token error:', error);
        res.status(500).json({ error: 'Failed to revoke token' });
    }
});
exports.default = router;
//# sourceMappingURL=tokens.js.map