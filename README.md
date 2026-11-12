# AI Support Engine

AI Support Engine es una API backend para clasificar inteligentemente solicitudes de soporte técnico mediante dos enfoques complementarios:
1. **Motor tradicional (reglas / simbólico):** Determinista, rápido y basado en expresiones regulares y ponderación léxica.
2. **Motor generativo (IA generativa real):** Basado en el SDK de Google Gemini con *Structured Outputs* (JSON estricto) y respuestas contextualizadas.

Desarrollado bajo una arquitectura modular desacoplada para trabajo en equipo de 3 integrantes.

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
- [x] **Integrante 2:** Motor generativo real con Google Gemini (`src/engines/generative.ts`), *Structured JSON Output*, control de excepciones/proveedor, seguridad de API keys y pruebas unitarias (`tests/generative.test.ts`).
- [ ] **Integrante 3:** Capa complementaria de revisión humana (`src/security/human-review.ts`), dataset de 10 casos comparativos (`tests/dataset.json`), script de benchmarking (`tests/benchmark.ts`) y tabla de resultados comparativos.
