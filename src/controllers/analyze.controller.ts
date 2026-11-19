import type { Request, Response } from 'express';

import { classifyWithGenerativeAI } from '../engines/generative';
import { classifyWithMl } from '../engines/ml';
import { classifySupportRequest } from '../engines/traditional';
import { applyHumanReview } from '../security/human-review';
import type { AnalyzeResponse } from '../types';

export async function analyzeController(req: Request, res: Response): Promise<void> {
  const { message, mode } = req.body as {
    message: string;
    mode: 'traditional' | 'generative' | 'ml';
  };

  try {
    let result: AnalyzeResponse;

    if (mode === 'generative') {
      result = await classifyWithGenerativeAI(message, { maxRetries: 2 });
    } else if (mode === 'ml') {
      result = await classifyWithMl(message);
    } else {
      result = classifySupportRequest(message, mode);
    }

    // Integrante 3: capa de revisión humana — aplica reglas de seguridad y detección de inyección
    result = applyHumanReview(result, message);

    res.status(200).json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error interno al procesar la solicitud';

    if (mode === 'ml') {
      res.status(503).json({
        error: 'ML model unavailable',
        message: 'No se pudo iniciar el modelo ML. Comprueba Python, sus dependencias y tickets.csv.',
        mode,
      });
      return;
    }

    res.status(502).json({
      error: 'Generative provider error',
      message: errorMessage,
      mode,
    });
  }
}
