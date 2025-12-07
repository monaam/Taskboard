import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import checklistRoutes from './routes/checklists';
import textNoteRoutes from './routes/textNotes';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
