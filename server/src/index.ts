import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import checklistRoutes from './routes/checklists';
import textNoteRoutes from './routes/textNotes';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// The frontend is hosted on Netlify, so API calls are cross-origin. Auth is a
// Bearer token, not a cookie, so no credentials handling is needed here.
// Override CORS_ORIGIN (comma-separated) to add origins such as Netlify
// deploy previews without a code change.
const allowedOrigins = (
  process.env.CORS_ORIGIN ??
  'https://trybe-task-board.netlify.app,https://trybe-taskboard-aws.on-forge.com'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Make prisma available in routes
app.set('prisma', prisma);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/textnotes', textNoteRoutes);

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
