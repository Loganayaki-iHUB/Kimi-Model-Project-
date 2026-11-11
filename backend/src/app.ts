import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import generationRoutes from "./routes/generation.routes";
import studioRoutes from "./studio/routes";
import { config } from "./config/env";
import { ZodError } from "zod";
import { HttpError } from "./studio/service";

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [
        config.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ],
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  // Routes
  app.use("/api/generation", generationRoutes);
  app.use("/api/studio", studioRoutes);

  // Global Error Handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const status =
      err instanceof ZodError
        ? 400
        : err instanceof HttpError
          ? err.status
          : (err as any).status || 500;
    res
      .status(status)
      .json({
        success: false,
        error:
          err instanceof ZodError
            ? err.issues.map((e) => e.message).join(", ")
            : err.message || "Something went wrong. Please try again.",
      });
  });

  return app;
};
