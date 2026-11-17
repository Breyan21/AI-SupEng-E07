import type { Request, Response } from 'express';

import { classifyWithGenerativeAI } from '../engines/generative';
import { classifySupportRequest } from '../engines/traditional';
import { applyHumanReview, detectsInjectionAttempt } from '../security/human-review';
import type { AnalyzeResponse } from '../types';

export async function analyzeController(req: Request, res: Response): Promise<void> {
  const { message, mode } = req.body as { message: string; mode: 'traditional' | 'generative' };

  // Integrante 3: Detección preventiva de inyección / manipulación de instrucciones
  if (detectsInjectionAttempt(message)) {
    const securityResponse: AnalyzeResponse = applyHumanReview(
      {
        category: 'SECURITY',
        priority: 'CRITICAL',
        response:
          'Se ha detectado una solicitud con potenciales riesgos de seguridad o manipulación de instrucciones. La solicitud ha sido escalada para revisión humana inmediata.',
        requiresHumanReview: true,
        mode,
      },
      message,
    );
    res.status(200).json(securityResponse);
    return;
  }

  try {
    let result: AnalyzeResponse;

    if (mode === 'generative') {
      result = await classifyWithGenerativeAI(message, { maxRetries: 1 });
    } else {
      result = classifySupportRequest(message, mode);
    }

    // Reglas de revisión humana complementarias
    result = applyHumanReview(result, message);

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
