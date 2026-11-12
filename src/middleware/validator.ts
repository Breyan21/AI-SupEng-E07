import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import type { AnalyzeRequest } from '../types';

export const analyzeRequestSchema = z.object({
  message: z
    .string({
      required_error: 'message is required',
      invalid_type_error: 'message must be a string',
    })
    .trim()
    .min(1, 'message cannot be empty or whitespace only')
    .max(5000, 'message exceeds the maximum length of 5000 characters'),
  mode: z.enum(['traditional', 'generative'], {
    errorMap: () => ({
      message: 'mode must be either "traditional" or "generative"',
    }),
  }),
});

export function validateAnalyzeRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): boolean {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({
      error: 'Invalid request body',
      details: ['Request body must be a JSON object.'],
    });
    return false;
  }

  const parsed = analyzeRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message);
    res.status(400).json({
      error: 'Invalid request body',
      details,
    });
    return false;
  }

  req.body = parsed.data as AnalyzeRequest;
  next();
  return true;
}
