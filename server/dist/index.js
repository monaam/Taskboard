"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("./routes/auth"));
const checklists_1 = __importDefault(require("./routes/checklists"));
const textNotes_1 = __importDefault(require("./routes/textNotes"));
const tokens_1 = __importDefault(require("./routes/tokens"));
const auth_2 = require("./middleware/auth");
const openapi_1 = require("./lib/openapi");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 3001;
// The frontend is hosted on Netlify, so API calls are cross-origin. Auth is a
// Bearer token, not a cookie, so no credentials handling is needed here.
// Override CORS_ORIGIN (comma-separated) to add origins such as Netlify
// deploy previews without a code change.
const allowedOrigins = (process.env.CORS_ORIGIN ??
    'https://trybe-task-board.netlify.app,https://trybe-taskboard-aws.on-forge.com')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
// Middleware
app.use((0, cors_1.default)({ origin: allowedOrigins }));
app.use(express_1.default.json());
// Make prisma available in routes
app.set('prisma', prisma);
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/checklists', checklists_1.default);
app.use('/api/textnotes', textNotes_1.default);
// authMiddleware here rather than inside the router: tokens.ts mounts
// requireSession at its own root, and that can only judge req.authKind once
// something has set it.
app.use('/api/tokens', auth_2.authMiddleware, tokens_1.default);
// The API's own documentation, linked from the token screen. Unauthenticated
// on purpose: an agent has to be able to discover the shape of the API before
// it has been handed a token, and the document describes no private data.
//
// Built per request from the forwarded host, so the `servers` block names the
// origin the caller actually reached -- behind nginx, the process only sees
// 127.0.0.1:3000 and a hardcoded URL would be wrong in one environment or the
// other.
app.get('/api/docs', (req, res) => {
    const proto = req.headers['x-forwarded-proto'] ?? req.protocol;
    const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? '';
    res.json((0, openapi_1.buildOpenApiDocument)(`${proto}://${host}`));
});
// Health check. uptime is seconds since the process started, so a deploy that
// failed to restart the daemon is visible rather than silent.
app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map