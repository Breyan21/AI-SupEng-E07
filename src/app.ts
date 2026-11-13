import 'dotenv/config';

import express from 'express';

import { analyzeController } from './controllers/analyze.controller';
import { validateAnalyzeRequest } from './middleware/validator';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.post('/api/analyze', validateAnalyzeRequest, analyzeController);

export function startServer(port: number = Number(process.env.PORT ?? 3000)): void {
  app.listen(port, () => {
    console.log(`AI Support Engine listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer();
}

export { app };
