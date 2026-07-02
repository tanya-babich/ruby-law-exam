import express from 'express';
import cors from 'cors';
import { contractRoutes } from './routes/contracts';
import { notFoundHandler } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): express.Application {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
  app.use(express.json());
  app.use('/api/contracts', contractRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
