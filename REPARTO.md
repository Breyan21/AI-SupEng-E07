# Reparto de Trabajo: AI Support Engine

- **Proyecto:** AI Support Engine (Clasificación Inteligente de Solicitudes de Soporte)
- **Modalidad:** Equipo de 3 integrantes
- **Duración estimada:** 2 – 3 horas
- **Nivel:** Avanzado
- **Stack:** Node.js (v20+) + TypeScript + Express + tsx + Google Gemini API (`@google/genai`)

---

## 1. Resumen de Requerimientos y Rúbrica (100%)

| Criterio de Evaluación | Ponderación | Entregable Clave |
|---|:---:|---|
| **Motor Tradicional Funcional** | **25%** | Reglas simbólicas, 4 categorías, 4 prioridades y respuesta predeterminada. |
| **Integración Real de IA Generativa** | **30%** | Llamada a modelo real (Gemini), prompt engineering y JSON estructurado. |
| **Validaciones, Errores y Seguridad** | **20%** | Validación HTTP, manejo de fallas de IA y flag `requiresHumanReview: true`. |
| **Pruebas Comparativas y Resultados** | **15%** | Dataset de 10 casos (incluye 2 ataques adversariales) y script con métricas de acierto %. |
| **Repositorio, README y Evidencias** | **10%** | Instrucciones de setup, tabla de resultados y conclusión técnica ($\le$ 150 palabras). |
| **Total** | **100%** | |

---

## 2. Contrato de API y Reglas del Sistema

### Endpoint: `POST /api/analyze`

#### Esquema de Solicitud (Request Body):
```json
{
  "message": "No puedo iniciar sesión con mi contraseña",
  "mode": "generative"
}
```

#### Esquema de Respuesta Común (Response Body):
```json
{
  "category": "ACCESS",
  "priority": "MEDIUM",
  "response": "Lamentamos el inconveniente. Verifique sus credenciales...",
  "requiresHumanReview": false,
  "mode": "generative"
}
```

#### Valores Permitidos:
- **`category`**: `ACCESS` | `BUG` | `FEATURE` | `SECURITY`
- **`priority`**: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`
- **`mode`**: `traditional` | `generative`
- **`requiresHumanReview`**: `true` si es un incidente de seguridad (`SECURITY`), intento de *prompt injection* o solicitud ambigua crítica; `false` en caso contrario.

---

## 3. Estructura Modular del Proyecto

Diseñada para desacoplar el trabajo y evitar *merge conflicts* en Git:

```text
ai-support-engine/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── REPARTO.md
├── src/
│   ├── types/
│   │   └── index.ts                 # Integrante 1: Contrato e interfaces de entrada/salida
│   ├── middleware/
│   │   └── validator.ts             # Integrante 1: Validación de esquemas y tipos HTTP
│   ├── engines/
│   │   ├── traditional.ts           # Integrante 1: Motor simbólico y heurísticas
│   │   └── generative.ts            # Integrante 2: Integración real con LLM y Structured JSON
│   ├── security/
│   │   └── human-review.ts          # Integrante 3: Reglas de intervención humana y antievasión
│   ├── controllers/
│   │   └── analyze.controller.ts    # Integrante 1 y 2: Orquestación del endpoint POST /api/analyze
│   └── app.ts                       # Integrante 1: Configuración del servidor Express
└── tests/
    ├── dataset.json                 # Integrante 3: 10 casos de prueba (normales, ambiguos, ataques)
    ├── traditional.test.ts          # Integrante 1: Pruebas unitarias del motor tradicional
    ├── generative.test.ts           # Integrante 2: Pruebas del motor generativo y resiliencia
    └── benchmark.ts                 # Integrante 3: Script comparativo automático y cálculo de %
```

---

## 4. Reparto Detallado por Integrante

### 👤 Integrante 1: Arquitectura de API, Contratos y Motor Tradicional
* **Rama Git:** `feat/api-and-traditional-engine`
* **Porcentaje del Reto:** 35% de cobertura directa
* **Responsabilidades y Entregables:**
  1. **Contratos e Interfaces (`src/types/index.ts`):** Tipos estrictos `Category`, `Priority`, `Mode`, `AnalyzeRequest` y `AnalyzeResponse`.
  2. **Validación HTTP (`src/middleware/validator.ts`):** Validar con Zod que `message` y `mode` existan y sean válidos (retornar HTTP 400 ante datos malformados).
  3. **Motor Tradicional (`src/engines/traditional.ts`):** Clasificador simbólico con heurísticas ponderadas para las 4 categorías, cálculo de prioridades y respuestas predeterminadas.
  4. **Servidor Express y Ruteo (`src/app.ts` y `src/controllers/analyze.controller.ts`):** Exponer `POST /api/analyze`.
* **Comando de prueba local:**
  ```bash
  npm test tests/traditional.test.ts
  ```

---

### 👤 Integrante 2: Motor Generativo Real, Structured JSON y Resiliencia
* **Rama Git:** `feat/generative-engine`
* **Porcentaje del Reto:** 35% de cobertura directa
* **Responsabilidades y Entregables:**
  1. **Integración con LLM Real (`src/engines/generative.ts`):**
     - Conectar SDK oficial de Google Gemini (`@google/genai`) con modelo `gemini-1.5-flash` / `gemini-2.0-flash`.
     - Diseñar *System Instructions* y *Few-Shot Prompting* para clasificar con precisión las 4 categorías y 4 prioridades, generando respuestas empáticas, profesionales y contextualizadas.
     - Configurar **Structured JSON Output** nativo (`responseSchema`) para garantizar que el modelo retorne un JSON válido que cumpla el contrato de salida sin delimitadores markdown.
  2. **Resiliencia y Manejo de Errores:**
     - Manejo de excepciones de red, cuotas excedidas, API key ausente o timeouts del proveedor de IA.
     - Mecanismo de validación con Zod de la respuesta generativa con fallback seguro.
  3. **Conexión en Controlador (`src/controllers/analyze.controller.ts`):**
     - Conectar la llamada asíncrona a `classifyWithGenerativeAI` cuando `mode === 'generative'`.
  4. **Seguridad de Secretos y Pruebas Unitarias:**
     - Archivo `.env.example` y lectura de `process.env.GEMINI_API_KEY`.
     - Suite de pruebas unitarias (`tests/generative.test.ts`).
* **Comando de prueba local:**
  ```bash
  npm test tests/generative.test.ts
  ```

---

### 👤 Integrante 3: Controles de Seguridad (Human Review), Dataset y Benchmarking
* **Rama Git:** `feat/security-and-benchmarking`
* **Porcentaje del Reto:** 30% de cobertura directa
* **Responsabilidades y Entregables:**
  1. **Seguridad e Intervención Humana (`src/security/human-review.ts`):**
     - Lógica que marca `requiresHumanReview: true` cuando `category === 'SECURITY'`, `priority === 'CRITICAL'` o se detecten patrones de ataque de inyección de prompt (*"Ignore previous instructions"*, *"override system"*, etc.).
  2. **Dataset de Pruebas (`tests/dataset.json`):**
     - 10 casos de prueba con *ground truth*: 4 normales, 4 ambiguos y 2 de intento de evasión/prompt injection.
  3. **Script Comparativo Automático (`tests/benchmark.ts`):**
     - Script ejecutable (`npm run test:compare`) que envía los 10 casos a ambos motores, compara con el *ground truth* y calcula el porcentaje de aciertos de cada motor.
  4. **Documentación Final (`README.md`):**
     - Instrucciones de instalación y ejecución.
     - Tabla comparativa de resultados.
     - Conclusión técnica ($\le$ 150 palabras) sobre el desempeño de ambos motores.
* **Comando de prueba local:**
  ```bash
  npx tsx tests/benchmark.ts
  ```
