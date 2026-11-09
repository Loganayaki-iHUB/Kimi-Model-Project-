import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import generationRoutes from './routes/generation.routes';

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/api/generation', generationRoutes);

  // Global Error Handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: err.message,
    });
  });

  return app;
};

