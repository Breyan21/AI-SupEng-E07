# AI Support Engine

AI Support Engine is a backend API for classifying technical support requests using a deterministic rule-based engine and a future generative engine. The project is being developed in a modular way so each team member owns a clearly defined responsibility.

## Requirements

- Node.js LTS
- npm

## Installation

```bash
npm install
```

## Run the server

```bash
npm run dev
```

The API is available at `http://localhost:3000/api/analyze`.

## Run tests

```bash
npm test
```

## Example request

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"No puedo iniciar sesión con mi contraseña","mode":"traditional"}'
```

## Pending integrations

- Generative engine: pending integration by the second team member.
- Human review layer: pending integration by the third team member.

This repository currently implements the shared contract, validation middleware, traditional rule engine, and the Express API endpoint for the Integrante 1 scope.
