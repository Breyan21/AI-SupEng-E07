import type { Request, Response } from 'express';

import { classifyWithGenerativeAI } from '../engines/generative';
import { classifySupportRequest } from '../engines/traditional';
import type { AnalyzeResponse } from '../types';

export async function analyzeController(req: Request, res: Response): Promise<void> {
  const { message, mode } = req.body as { message: string; mode: 'traditional' | 'generative' };

  try {
    let result: AnalyzeResponse;

    if (mode === 'generative') {
      result = await classifyWithGenerativeAI(message);
    } else {
      result = classifySupportRequest(message, mode);
    }

    // TODO: Integrante 3 - capa complementaria de human-review si aplica.
    res.status(200).json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error interno al procesar la solicitud';

    res.status(502).json({
      error: 'Generative provider error',
      message: errorMessage,
      mode,
    });
  }
}
