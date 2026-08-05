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
// Health check
app.get('/api/health', (_, res) => {
    res.json({ status: 'ok' });
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