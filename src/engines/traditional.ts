import type { AnalyzeResponse, Category, Mode, Priority } from '../types';

const categoryOrder: Category[] = ['SECURITY', 'BUG', 'ACCESS', 'FEATURE'];

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getResponseText(category: Category): string {
  const messages: Record<Category, string> = {
    ACCESS:
      'Lamentamos el inconveniente. Verifique sus credenciales e intente recuperar su contraseña si es necesario.',
    BUG: 'Hemos identificado un problema funcional. Revisaremos el fallo y su impacto operativo para continuar con la corrección.',
    FEATURE:
      'Gracias por la sugerencia. Registramos la solicitud de mejora para evaluarla con el equipo de producto.',
    SECURITY:
      'Se registró una posible incidencia de seguridad. Es necesario revisarla con prioridad y aplicar las medidas de mitigación correspondientes.',
  };

  return messages[category];
}

function normalizePatterns(values: string[]): string[] {
  return values.map((value) => normalizeText(value));
}

function computePriority(category: Category, normalized: string): Priority {
  if (category === 'SECURITY') {
    if (/filtracion|brecha|exposicion|inyeccion sql|base de datos|vulnerabilidad critica|acceso no autorizado/.test(normalized)) {
      return 'CRITICAL';
    }
    return 'HIGH';
  }

  if (category === 'BUG') {
    if (/error 500|pantalla en blanco|se congela|aplicacion se cierra|falla critica|interrupcion operacional|caida del sistema|cuelga/.test(normalized)) {
      return 'HIGH';
    }
    return 'MEDIUM';
  }

  if (category === 'ACCESS') {
    return 'MEDIUM';
  }

  if (/autenticacion|integracion|modulo|api|seguridad|sistema/.test(normalized)) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function buildCategoryScores(normalized: string): Record<Category, number> {
  const scores: Record<Category, number> = {
    ACCESS: 0,
    BUG: 0,
    FEATURE: 0,
    SECURITY: 0,
  };

  const categoryPatterns: Record<Category, { phrases: string[]; words: string[] }> = {
    ACCESS: {
      phrases: normalizePatterns([
        'no puedo iniciar sesion',
        'no puedo entrar',
        'contrasena incorrecta',
        'olvide mi contrasena',
        'recuperar cuenta',
        'problemas de acceso',
        'no tengo acceso',
        'acceso denegado',
        'no puedo ingresar',
        'recuperacion de cuenta',
      ]),
      words: normalizePatterns([
        'iniciar',
        'sesion',
        'contrasena',
        'acceso',
        'login',
        'entrar',
        'cuenta',
        'credencial',
        'autenticacion',
        'recuperacion',
      ]),
    },
    BUG: {
      phrases: normalizePatterns([
        'error 500',
        'la aplicacion se congela',
        'se congela',
        'la pantalla queda en blanco',
        'sistema falla',
        'la aplicacion se cierra',
        'error fatal',
        'pantalla en blanco',
        'aplicacion se congela',
      ]),
      words: normalizePatterns([
        'error',
        'falla',
        'fallo',
        'congela',
        'crash',
        'blanco',
        'bug',
        'caida',
        'sistema',
      ]),
    },
    FEATURE: {
      phrases: normalizePatterns([
        'agregar funcionalidad',
        'nueva caracteristica',
        'modo oscuro',
        'seria util incluir',
        'solicitud de mejora',
        'agregar un boton',
        'mejora',
        'implementar',
        'autenticacion con huella digital',
      ]),
      words: normalizePatterns([
        'agregar',
        'caracteristica',
        'funcionalidad',
        'mejora',
        'nueva',
        'boton',
        'modo oscuro',
        'incluir',
        'autenticacion',
        'huella',
      ]),
    },
    SECURITY: {
      phrases: normalizePatterns([
        'vulnerabilidad',
        'inyeccion sql',
        'acceso no autorizado',
        'filtracion de datos',
        'brecha de seguridad',
        'certificado ssl vencido',
        'exposicion de datos',
        'inyeccion de sql',
      ]),
      words: normalizePatterns([
        'sql',
        'vulnerabilidad',
        'seguridad',
        'filtracion',
        'brecha',
        'inyeccion',
        'ssl',
        'no autorizado',
        'datos',
      ]),
    },
  };

  for (const [category, patterns] of Object.entries(categoryPatterns) as [Category, { phrases: string[]; words: string[] }][]) {
    for (const phrase of patterns.phrases) {
      if (normalized.includes(phrase)) {
        scores[category] += 10;
      }
    }

    for (const word of patterns.words) {
      if (normalized.includes(word)) {
        scores[category] += 2;
      }
    }
  }

  if (normalized.includes('error') && !normalized.includes('error 500')) {
    scores.BUG += 2;
  }

  if (normalized.includes('acceso') && normalized.includes('no')) {
    scores.ACCESS += 3;
  }

  return scores;
}

export function classifySupportRequest(message: string, mode: Mode = 'traditional'): AnalyzeResponse {
  const normalized = normalizeText(message);
  const scores = buildCategoryScores(normalized);

  const winningCategory = categoryOrder.reduce((best, current) => {
    if (scores[current] > scores[best]) {
      return current;
    }
    return best;
  }, categoryOrder[0]);

  const category = scores[winningCategory] > 0 ? winningCategory : 'FEATURE';
  const priority = computePriority(category, normalized);

  return {
    category,
    priority,
    response: getResponseText(category),
    requiresHumanReview: category === 'SECURITY' || priority === 'CRITICAL',
    mode,
  };
}
