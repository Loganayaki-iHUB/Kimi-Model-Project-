import { Request, Response } from 'express';
import { z } from 'zod';
import { generationService } from '../services/generation.service';

const generateSchema = z.object({
  prompt: z.string().min(1, 'Please enter a prompt'),
  framework: z.enum(['html-tailwind', 'react']).optional().default('html-tailwind'),
});

export class GenerationController {
  static async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      const status = await generationService.checkStatus();
      res.status(200).json(status);
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  static async generate(req: Request, res: Response): Promise<void> {
    const parseResult = generateSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => e.message),
      });
      return;
    }

    const result = await generationService.generateWebsite(parseResult.data);

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.status(200).json(result);
  }
}

