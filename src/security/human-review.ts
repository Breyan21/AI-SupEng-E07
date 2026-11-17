import type { AnalyzeResponse } from '../types';

/**
 * Patrones de texto que indican un intento de prompt injection o jailbreak.
 * Se normalizan a minúsculas antes de la comparación.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignora?\s+(todas?\s+)?(las?\s+)?instrucciones?\s+anteriores?/i,
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /override\s+system/i,
  /system\s+override/i,
  /olvida\s+(todas?\s+)?(las?\s+)?instrucciones?/i,
  /act\s+as\s+if\s+you\s+are/i,
  /ahora\s+eres\s+un\s+bot/i,
  /responde\s+únicamente\s+con/i,
  /respond\s+only\s+with/i,
  /pon\s+requireshumanreview\s+en\s+false/i,
  /set\s+requireshumanreview\s+to\s+false/i,
  /clasifica\s+(esta\s+)?(como\s+)?prioridad\s+baja/i,
  /categoria\s+feature/i,
  /jailbreak/i,
  /prompt\s+injection/i,
];

/**
 * Detecta si un mensaje de entrada contiene un patrón de ataque conocido.
 * @param message Texto original de la solicitud del usuario.
 * @returns true si se detecta un intento de inyección o evasión.
 */
export function detectsInjectionAttempt(message: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Aplica las reglas de revisión humana obligatoria sobre el resultado final.
 *
 * Activa requiresHumanReview: true si:
 * - La categoría es SECURITY.
 * - La prioridad es CRITICAL.
 * - Se detecta un patrón de prompt injection en el mensaje original.
 *
 * @param result  Resultado parcial producido por cualquiera de los motores.
 * @param message Texto original de la solicitud (para detección de inyecciones).
 * @returns Resultado con requiresHumanReview correctamente aplicado.
 */
export function applyHumanReview(result: AnalyzeResponse, message: string): AnalyzeResponse {
  const injectionDetected = detectsInjectionAttempt(message);

  if (injectionDetected) {
    return {
      ...result,
      category: 'SECURITY',
      priority: 'CRITICAL',
      requiresHumanReview: true,
      response:
        result.response ||
        'Se ha detectado una solicitud irregular o con potenciales riesgos de seguridad. La solicitud ha sido escalada para revisión humana inmediata.',
    };
  }

  const requiresHumanReview =
    result.requiresHumanReview ||
    result.category === 'SECURITY' ||
    result.priority === 'CRITICAL';

  return {
    ...result,
    requiresHumanReview,
  };
}

