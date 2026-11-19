import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';

import type { AnalyzeResponse, Category, Priority } from '../types';
import { classifySupportRequest, normalizeText } from './traditional';

interface PendingPrediction {
  resolve: (category: Category) => void;
  reject: (error: Error) => void;
}

let worker: ChildProcessWithoutNullStreams | null = null;
let workerReady: Promise<void> | null = null;
const pendingPredictions: PendingPrediction[] = [];

const categorySchema: readonly Category[] = ['ACCESS', 'BUG', 'FEATURE', 'SECURITY'];
const UNAUTHORIZED_ACCESS_SIGNAL = /sin autorizacion|sin permiso|acceso no autorizado|cuenta ajena/;

const categoryResponses: Record<Category, string> = {
  ACCESS: 'Lamentamos el inconveniente. Verifique sus credenciales e intente recuperar su contraseña si es necesario.',
  BUG: 'Hemos identificado un posible problema funcional. Revisaremos el fallo y su impacto operativo.',
  FEATURE: 'Gracias por la sugerencia. Registramos la solicitud para que el equipo de producto la evalúe.',
  SECURITY: 'Se identificó una posible incidencia de seguridad que requiere revisión prioritaria.',
};

function rejectPendingPredictions(error: Error): void {
  while (pendingPredictions.length > 0) {
    pendingPredictions.shift()?.reject(error);
  }
}

function startWorker(): Promise<void> {
  if (worker && worker.exitCode === null && worker.signalCode === null && workerReady) {
    return workerReady;
  }

  const workingDirectory = process.cwd();
  const workerPath = process.env.ML_WORKER_PATH ?? path.join(workingDirectory, 'ml_worker.py');
  const pythonExecutable = process.env.PYTHON_EXECUTABLE ?? 'python';
  const child = spawn(pythonExecutable, [workerPath], {
    cwd: workingDirectory,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  worker = child;
  child.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk));

  workerReady = new Promise<void>((resolve, reject) => {
    let ready = false;
    const startupTimeout = setTimeout(() => {
      const error = new Error('El worker ML no respondió durante el inicio.');
      child.kill();
      reject(error);
    }, 60_000);

    const lines = createInterface({ input: child.stdout });
    lines.on('line', (line) => {
      let payload: unknown;
      try {
        payload = JSON.parse(line);
      } catch {
        const error = new Error('El worker ML devolvió una respuesta inválida.');
        if (!ready) {
          clearTimeout(startupTimeout);
          reject(error);
        } else {
          pendingPredictions.shift()?.reject(error);
        }
        return;
      }

      if (!ready) {
        if (typeof payload === 'object' && payload !== null && 'ready' in payload) {
          ready = true;
          clearTimeout(startupTimeout);
          resolve();
        } else {
          clearTimeout(startupTimeout);
          reject(new Error('El worker ML no confirmó que el modelo estuviera listo.'));
        }
        return;
      }

      const pending = pendingPredictions.shift();
      if (!pending) {
        return;
      }

      if (
        typeof payload === 'object' &&
        payload !== null &&
        'category' in payload &&
        typeof payload.category === 'string' &&
        categorySchema.includes(payload.category as Category)
      ) {
        pending.resolve(payload.category as Category);
        return;
      }

      const errorMessage =
        typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : 'El worker ML devolvió una categoría inválida.';
      pending.reject(new Error(errorMessage));
    });

    child.once('error', (error) => {
      clearTimeout(startupTimeout);
      if (!ready) {
        reject(error);
      }
      rejectPendingPredictions(error);
      worker = null;
      workerReady = null;
    });

    child.once('exit', (code, signal) => {
      clearTimeout(startupTimeout);
      const error = new Error(`El worker ML terminó inesperadamente (código ${code ?? signal ?? 'desconocido'}).`);
      if (!ready) {
        reject(error);
      }
      rejectPendingPredictions(error);
      worker = null;
      workerReady = null;
      lines.close();
    });
  });

  return workerReady;
}

async function predictCategory(message: string): Promise<Category> {
  await startWorker();
  if (!worker || worker.exitCode !== null || worker.signalCode !== null) {
    throw new Error('El worker ML no está disponible.');
  }

  return new Promise<Category>((resolve, reject) => {
    const pending = { resolve, reject };
    pendingPredictions.push(pending);

    try {
      worker?.stdin.write(`${JSON.stringify({ message })}\n`);
    } catch (error: unknown) {
      const pendingIndex = pendingPredictions.indexOf(pending);
      if (pendingIndex >= 0) {
        pendingPredictions.splice(pendingIndex, 1);
      }
      reject(error instanceof Error ? error : new Error('No se pudo enviar el mensaje al modelo ML.'));
    }
  });
}

function getPriority(category: Category, message: string): Priority {
  const traditionalResult = classifySupportRequest(message, 'traditional');
  if (category === 'SECURITY' && traditionalResult.priority !== 'CRITICAL') {
    return 'HIGH';
  }
  return traditionalResult.priority;
}

export async function classifyWithMl(message: string): Promise<AnalyzeResponse> {
  const predictedCategory = await predictCategory(message);
  const normalizedMessage = normalizeText(message);
  const category = UNAUTHORIZED_ACCESS_SIGNAL.test(normalizedMessage)
    ? 'SECURITY'
    : predictedCategory;
  const priority = getPriority(category, message);

  return {
    category,
    priority,
    response: categoryResponses[category],
    requiresHumanReview: category === 'SECURITY' || priority === 'CRITICAL',
    mode: 'ml',
  };
}

export async function stopMlWorker(): Promise<void> {
  const currentWorker = worker;
  if (!currentWorker) {
    return;
  }

  if (currentWorker.exitCode === null && currentWorker.signalCode === null) {
    await new Promise<void>((resolve) => {
      currentWorker.once('exit', () => resolve());
      currentWorker.kill();
    });
  }

  worker = null;
  workerReady = null;
}