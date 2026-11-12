import type { Request, Response } from 'express';

import { classifySupportRequest } from '../engines/traditional';
import type { AnalyzeResponse } from '../types';

export function analyzeController(req: Request, res: Response): void {
  const { message, mode } = req.body as { message: string; mode: 'traditional' | 'generative' };

  if (mode === 'generative') {
    res.status(501).json({
      error: 'Generative mode is not available yet',
      message:
        'The generative engine is not yet integrated. This endpoint will be connected to the module developed by Integrante 2.',
    });
    return;
  }

  const result: AnalyzeResponse = classifySupportRequest(message, mode);

  // TODO: Integrante 3 - insert the human review step before returning the response.
  res.status(200).json(result);
}
