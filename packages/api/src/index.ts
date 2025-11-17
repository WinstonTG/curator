/**
 * Curator API Server
 * Express server with preference graph CRUD endpoints
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import preferencesRouter from './routes/preferences';
import onboardingRouter from './routes/onboarding';
import analyticsRouter from './routes/analytics';
import gdprRouter from './routes/gdpr';

// Load environment variables
dotenv.config();

const app: express.Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', authRouter);
app.use('/api', preferencesRouter);
app.use('/api', onboardingRouter);
app.use('/api', analyticsRouter);
app.use('/api', gdprRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server (only if not in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Curator API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

export default app;
