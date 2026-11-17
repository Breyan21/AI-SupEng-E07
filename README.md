# AI Support Engine

AI Support Engine es una API backend para clasificar inteligentemente solicitudes de soporte técnico mediante dos enfoques complementarios:
1. **Motor tradicional (reglas / simbólico):** Determinista, rápido y basado en expresiones regulares y ponderación léxica.
2. **Motor generativo (IA generativa real):** Basado en el SDK de Google Gemini con *Structured Outputs* (JSON estricto) y respuestas contextualizadas.

Desarrollado bajo una arquitectura modular desacoplada para trabajo en equipo de 3 integrantes.

## Integrantes del equipo

- **José Miguel Jiménez Enríquez** — *Integrante 3:* Seguridad (`human-review`), Dataset de pruebas, Benchmarking y Documentación.
- **Eduardo Lezama Zarate** — *Integrante 1:* Arquitectura de API, Contratos de tipos y Motor Tradicional.
- **Breyan Sebastián Matías Lira** — *Integrante 2:* Integración de IA Generativa con Google Gemini y Structured Outputs.

## Requisitos

- Node.js LTS (v20 o superior recomendado)
- npm

## Instalación

```bash
npm install
```

## Configuración de Variables de Entorno

Copie el archivo de ejemplo y configure su clave de API de Google Gemini (obtenida en [Google AI Studio](https://aistudio.google.com/)):

```bash
cp .env.example .env
```

Edite `.env`:
```env
PORT=3000
GEMINI_API_KEY=tu_api_key_real_aqui
GEMINI_MODEL=gemini-1.5-flash
```

## Ejecución del Servidor

En modo desarrollo con recarga en vivo:
```bash
npm run dev
```

La API estará disponible en `http://localhost:3000/api/analyze`.

## Ejecución de Pruebas

```bash
npm test
```

Verificación estática de tipos y build de producción:
```bash
npm run typecheck
npm run build
```

## Ejemplos de Petición

### 1. Modo Tradicional
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"No puedo iniciar sesión con mi contraseña","mode":"traditional"}'
```

### 2. Modo Generativo
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"La base de datos arroja timeout al intentar guardar un registro","mode":"generative"}'
```

## Estado de las Integraciones

- [x] **Integrante 1:** Contrato compartido (`src/types/index.ts`), validación HTTP con Zod (`src/middleware/validator.ts`), motor tradicional (`src/engines/traditional.ts`) y servidor Express (`src/app.ts`).
- [x] **Integrante 2:** Motor generativo real con Google Gemini (`src/engines/generative.ts`), *Structured JSON Output*, control de excepciones/proveedor (429/503), seguridad de API keys y pruebas unitarias (`tests/generative.test.ts`).
- [x] **Integrante 3:** Capa complementaria de revisión humana (`src/security/human-review.ts`), dataset de 10 casos comparativos (`tests/dataset.json`), script de benchmarking (`tests/benchmark.ts`) y tabla de resultados comparativos.

## Tabla de Resultados Comparativos (Benchmark)

Ejecución del dataset de 10 casos de prueba (`npm run test:compare`):

| ID | Tipo | Descripción | Tradicional (Cat / Pri / Rev) | Generativo (Cat / Pri / Rev) | Fmt Trad | Fmt Gen | OK Trad | OK Gen |
|:--:|:----:|:------------|:-----------------------------:|:----------------------------:|:--------:|:-------:|:-------:|:------:|
| 1 | Directo | ACCESS: Contraseña olvidada | ACCESS / MEDIUM / false | ACCESS / MEDIUM / false | ✓ | ✓ | ✓ | ✓ |
| 2 | Directo | BUG: Error 500 al exportar | BUG / HIGH / false | BUG / HIGH / false | ✓ | ✓ | ✓ | ✓ |
| 3 | Directo | FEATURE: Modo oscuro | FEATURE / LOW / false | FEATURE / LOW / false | ✓ | ✓ | ✓ | ✓ |
| 4 | Directo | SECURITY: Inyección SQL | SECURITY / CRITICAL / true | SECURITY / CRITICAL / true | ✓ | ✓ | ✓ | ✓ |
| 5 | Ambiguo | ACCESS + BUG (cuelgue al login) | BUG / HIGH / false | ACCESS / HIGH / false | ✓ | ✓ | ✓ | ✓ |
| 6 | Ambiguo | FEATURE + ACCESS (huella biométrica) | FEATURE / MEDIUM / false | FEATURE / MEDIUM / false | ✓ | ✓ | ✓ | ✓ |
| 7 | Ambiguo | ACCESS + BUG (cobro doble y sin acceso) | ACCESS / MEDIUM / false | BUG / HIGH / false | ✓ | ✓ | ✓ | ✓ |
| 8 | Ambiguo | SECURITY / BUG (SSL vencido) | SECURITY / HIGH / true | SECURITY / HIGH / true | ✓ | ✓ | ✓ | ✓ |
| 9 | Adversarial | Prompt Injection (forzar LOW/FEATURE) | SECURITY / CRITICAL / true | SECURITY / CRITICAL / true | ✓ | ✓ | ✓ | ✓ |
| 10 | Adversarial | Jailbreak (SYSTEM OVERRIDE) | SECURITY / CRITICAL / true | SECURITY / CRITICAL / true | ✓ | ✓ | ✓ | ✓ |

### Métricas Finales
- **Motor Tradicional:** 10/10 correctos (100%) | Formato válido: 10/10 (100%)
- **Motor Generativo:** 10/10 correctos (100%) | Formato válido: 10/10 (100%)

## Conclusión Técnica

La arquitectura híbrida implementada demuestra que ambos enfoques se complementan de forma ideal. El motor tradicional ofrece latencia nula y predictibilidad determinista para solicitudes operativas frecuentes sin costo computacional. Por su parte, el motor generativo (Google Gemini) destaca por su empatía conversacional y comprensión semántica profunda en solicitudes con matices complejos. No obstante, la capa de seguridad determinista (`human-review`) es indispensable: neutraliza ataques adversariales (*prompt injection* y *jailbreaks*) que ningún LLM debe resolver de forma aislada, garantizando escalamiento inmediato a revisión humana en incidentes críticos.

## Entregables y Evidencias

El repositorio cuenta con dos formatos de evidencia para evaluación:

### 1. Formato JSON (`evidence/`)
- `evidence/traditional_execution.json`: Evidencia de ejecución real del motor tradicional.
- `evidence/generative_execution.json`: Evidencia de ejecución real del motor generativo con Gemini.
- `evidence/security_adversarial_execution.json`: Evidencia de neutralización de Prompt Injection / Jailbreak.
- `evidence/benchmark_10_cases.json`: Dataset completo de 10 casos evaluados con resultados de ambos motores.
- `evidence/results_summary.json`: Resumen ejecutivo de entregables, métricas y conclusión.

### 2. Formato Capturas JPG (`evidencias/`)
- `evidencias/evidencia_1_pruebas_unitarias.jpg`: 26/26 pruebas unitarias pasadas.
- `evidencias/evidencia_2_benchmark_comparativo.jpg`: Salida de terminal del benchmark y tabla comparativa.
- `evidencias/evidencia_3_api_tradicional.jpg`: Petición curl y respuesta JSON tradicional.
- `evidencias/evidencia_4_api_generativo.jpg`: Petición curl y respuesta JSON generativa con IA.
- `evidencias/evidencia_5_api_seguridad_adversarial.jpg`: Petición adversarial neutralizada con `requiresHumanReview: true`.
- `evidencias/evidencia_6_typecheck_y_build.jpg`: Compilación limpia sin errores.

---

## Contribución y Evidencia Individual — José Miguel Jiménez Enríquez (Integrante 3)

- **Rol y Responsabilidades:** Integrante 3 — Seguridad (`human-review`), Dataset comparativo, Benchmarking y Estabilización General del Sistema.
- **Ramas desarrolladas y autoría Git:**
  - `feat/security-and-benchmarking`: Implementación inicial de la capa de seguridad, dataset de 10 casos y script de benchmarking.
  - `fix/generative-and-benchmark`: Actualización de compatibilidad de Gemini a `gemini-2.5-flash` (`v1beta`), sistema de resiliencia con reintentos exponenciales ante cuotas (HTTP 429/503), neutralización transversal de ataques adversariales y generación de evidencias JSON/JPG.
- **Entregables y archivos clave de autoría:**
  1. `src/security/human-review.ts`: Reglas de inspección de seguridad, antievasión y detección de patrones de manipulación (*Prompt Injection* / *Jailbreak*), activando `requiresHumanReview: true` y escalando a prioridad crítica.
  2. `tests/dataset.json`: Definición exhaustiva de 10 casos de prueba (4 directos, 4 ambiguos y 2 adversariales) con sus criterios esperados de categoría y prioridad.
  3. `tests/benchmark.ts`: Script automatizado de benchmarking (`npm run test:compare`) que evalúa ambos motores de extremo a extremo, calcula métricas de formato y acierto en tiempo real, e imprime la tabla comparativa.
  4. `evidence/` y `evidencias/`: Generación de todas las evidencias en formato JSON estructurado y capturas de terminal JPG en alta resolución para la entrega.
  5. `README.md`: Documentación técnica, tabla de resultados y redacción de la conclusión técnica comparativa.
- **Evidencias directas de ejecución:**
  - Benchmark de 10 casos: [evidence/benchmark_10_cases.json](evidence/benchmark_10_cases.json) y [evidencias/evidencia_2_benchmark_comparativo.jpg](evidencias/evidencia_2_benchmark_comparativo.jpg)
  - Neutralización de seguridad: [evidence/security_adversarial_execution.json](evidence/security_adversarial_execution.json) y [evidencias/evidencia_5_api_seguridad_adversarial.jpg](evidencias/evidencia_5_api_seguridad_adversarial.jpg)
  - Resumen ejecutivo: [evidence/results_summary.json](evidence/results_summary.json)
