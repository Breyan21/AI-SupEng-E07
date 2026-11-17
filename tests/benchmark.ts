/**
 * tests/benchmark.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Script comparativo que evalúa ambos motores (traditional / generative) contra
 * el dataset de 10 casos y calcula el porcentaje de acierto de cada uno.
 *
 * Uso:
 *   npx tsx tests/benchmark.ts
 *   npm run test:compare
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

import { classifyWithGenerativeAI } from '../src/engines/generative';
import { classifySupportRequest } from '../src/engines/traditional';
import { applyHumanReview, detectsInjectionAttempt } from '../src/security/human-review';
import type { AnalyzeResponse, Category, Priority } from '../src/types';

// ─── Tipos del Dataset ───────────────────────────────────────────────────────

interface ExpectedResult {
  category: Category | Category[];
  priority: Priority | Priority[];
  requiresHumanReview: boolean;
}

interface TestCase {
  id: number;
  type: 'direct' | 'ambiguous' | 'adversarial';
  description: string;
  message: string;
  expected: ExpectedResult;
}

interface CaseResult {
  id: number;
  type: string;
  description: string;
  message: string;
  expected: ExpectedResult;
  traditional: AnalyzeResponse | null;
  generative: AnalyzeResponse | null;
  traditionalError: string | null;
  generativeError: string | null;
  traditionalCorrect: boolean;
  generativeCorrect: boolean;
  traditionalFormatOk: boolean;
  generativeFormatOk: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REQUIRED_FIELDS = ['category', 'priority', 'response', 'requiresHumanReview', 'mode'];
const VALID_CATEGORIES: Category[] = ['ACCESS', 'BUG', 'FEATURE', 'SECURITY'];
const VALID_PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function validateFormat(result: AnalyzeResponse | null): boolean {
  if (!result || typeof result !== 'object') return false;
  for (const field of REQUIRED_FIELDS) {
    if (!(field in result)) return false;
  }
  if (!VALID_CATEGORIES.includes(result.category)) return false;
  if (!VALID_PRIORITIES.includes(result.priority)) return false;
  if (typeof result.response !== 'string' || result.response.trim() === '') return false;
  if (typeof result.requiresHumanReview !== 'boolean') return false;
  if (result.mode !== 'traditional' && result.mode !== 'generative') return false;
  return true;
}

function matchesExpected(result: AnalyzeResponse | null, expected: ExpectedResult): boolean {
  if (!result) return false;

  const categories = Array.isArray(expected.category) ? expected.category : [expected.category];
  const priorities = Array.isArray(expected.priority) ? expected.priority : [expected.priority];

  const categoryOk = categories.includes(result.category);
  const priorityOk = priorities.includes(result.priority);
  const reviewOk = expected.requiresHumanReview ? result.requiresHumanReview === true : true;

  return categoryOk && priorityOk && reviewOk;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function colorize(text: string, ok: boolean): string {
  const GREEN = '\x1b[32m';
  const RED = '\x1b[31m';
  const RESET = '\x1b[0m';
  return `${ok ? GREEN : RED}${text}${RESET}`;
}

// ─── Runner ──────────────────────────────────────────────────────────────────

async function runBenchmark(): Promise<void> {
  const datasetPath = join(__dirname, 'dataset.json');
  const cases: TestCase[] = JSON.parse(readFileSync(datasetPath, 'utf-8')) as TestCase[];

  const generativeEnabled = !!(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() !== '' &&
    process.env.GEMINI_API_KEY !== 'tu_api_key_aqui'
  );

  if (!generativeEnabled) {
    console.warn(
      '\x1b[33m[WARN] GEMINI_API_KEY no configurada. El motor generativo se omitirá y se contará como error.\x1b[0m\n',
    );
  }

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  AI Support Engine — Benchmark Comparativo');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  const results: CaseResult[] = [];

  for (const tc of cases) {
    console.log(`[${tc.id}/10] ${tc.type.toUpperCase()} — ${tc.description}`);
    console.log(`  Mensaje: "${tc.message.substring(0, 80)}${tc.message.length > 80 ? '…' : ''}"`);

    // ── Motor Tradicional ──
    let traditionalResult: AnalyzeResponse | null = null;
    let traditionalError: string | null = null;
    try {
      const raw = classifySupportRequest(tc.message, 'traditional');
      traditionalResult = applyHumanReview(raw, tc.message);
    } catch (e) {
      traditionalError = e instanceof Error ? e.message : String(e);
    }

    const tFormatOk = validateFormat(traditionalResult);
    const tCorrect = matchesExpected(traditionalResult, tc.expected);

    console.log(
      `  TRADICIONAL → cat:${traditionalResult?.category ?? 'ERR'} | pri:${traditionalResult?.priority ?? 'ERR'} | review:${traditionalResult?.requiresHumanReview ?? 'ERR'} | formato:${colorize(tFormatOk ? '✓' : '✗', tFormatOk)} | correcto:${colorize(tCorrect ? '✓' : '✗', tCorrect)}`,
    );
    if (traditionalError) console.log(`    ⚠ Error: ${traditionalError}`);

    // ── Motor Generativo ──
    let generativeResult: AnalyzeResponse | null = null;
    let generativeError: string | null = null;

    if (generativeEnabled) {
      try {
        // Pausa para evitar rate-limiting
        await sleep(1200);
        const raw = await classifyWithGenerativeAI(tc.message);
        generativeResult = applyHumanReview(raw, tc.message);
      } catch (e) {
        generativeError = e instanceof Error ? e.message : String(e);
      }
    } else {
      generativeError = 'GEMINI_API_KEY no configurada';
    }

    const gFormatOk = validateFormat(generativeResult);
    const gCorrect = matchesExpected(generativeResult, tc.expected);

    console.log(
      `  GENERATIVO  → cat:${generativeResult?.category ?? 'ERR'} | pri:${generativeResult?.priority ?? 'ERR'} | review:${generativeResult?.requiresHumanReview ?? 'ERR'} | formato:${colorize(gFormatOk ? '✓' : '✗', gFormatOk)} | correcto:${colorize(gCorrect ? '✓' : '✗', gCorrect)}`,
    );
    if (generativeError) console.log(`    ⚠ Error: ${generativeError}`);

    console.log(`  Esperado → cat:${Array.isArray(tc.expected.category) ? tc.expected.category.join('|') : tc.expected.category} | pri:${Array.isArray(tc.expected.priority) ? tc.expected.priority.join('|') : tc.expected.priority} | review:${tc.expected.requiresHumanReview}`);

    // Detección de inyección
    if (detectsInjectionAttempt(tc.message)) {
      console.log('  🛡  Patrón de Prompt Injection detectado → requiresHumanReview forzado');
    }

    console.log('');

    results.push({
      id: tc.id,
      type: tc.type,
      description: tc.description,
      message: tc.message,
      expected: tc.expected,
      traditional: traditionalResult,
      generative: generativeResult,
      traditionalError,
      generativeError,
      traditionalCorrect: tCorrect,
      generativeCorrect: gCorrect,
      traditionalFormatOk: tFormatOk,
      generativeFormatOk: gFormatOk,
    });
  }

  // ─── Tabla de resultados ───────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  TABLA DE RESULTADOS COMPARATIVOS');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log(
    `${'ID'.padEnd(4)}${'Tipo'.padEnd(12)}${'Trad.Cat'.padEnd(10)}${'Gen.Cat'.padEnd(10)}${'Trad.Pri'.padEnd(10)}${'Gen.Pri'.padEnd(10)}${'T.Rev'.padEnd(7)}${'G.Rev'.padEnd(7)}${'T.Fmt'.padEnd(7)}${'G.Fmt'.padEnd(7)}${'T.OK'.padEnd(6)}${'G.OK'.padEnd(6)}`,
  );
  console.log('─'.repeat(96));

  for (const r of results) {
    const tc = r.traditional;
    const gc = r.generative;
    console.log(
      `${String(r.id).padEnd(4)}${r.type.padEnd(12)}${(tc?.category ?? 'ERR').padEnd(10)}${(gc?.category ?? 'ERR').padEnd(10)}${(tc?.priority ?? 'ERR').padEnd(10)}${(gc?.priority ?? 'ERR').padEnd(10)}${String(tc?.requiresHumanReview ?? '-').padEnd(7)}${String(gc?.requiresHumanReview ?? '-').padEnd(7)}${(r.traditionalFormatOk ? '✓' : '✗').padEnd(7)}${(r.generativeFormatOk ? '✓' : '✗').padEnd(7)}${(r.traditionalCorrect ? '✓' : '✗').padEnd(6)}${(r.generativeCorrect ? '✓' : '✗').padEnd(6)}`,
    );
  }

  // ─── Métricas finales ──────────────────────────────────────────────────────

  const total = results.length;
  const tCorrectCount = results.filter((r) => r.traditionalCorrect).length;
  const gCorrectCount = results.filter((r) => r.generativeCorrect).length;
  const tFmtCount = results.filter((r) => r.traditionalFormatOk).length;
  const gFmtCount = results.filter((r) => r.generativeFormatOk).length;

  const tPct = ((tCorrectCount / total) * 100).toFixed(0);
  const gPct = ((gCorrectCount / total) * 100).toFixed(0);

  console.log('─'.repeat(96));
  console.log(`\n  MÉTRICAS FINALES`);
  console.log(`  Motor Tradicional: ${tCorrectCount}/${total} correctos (${tPct}%) | Formato válido: ${tFmtCount}/${total}`);
  console.log(`  Motor Generativo : ${gCorrectCount}/${total} correctos (${gPct}%) | Formato válido: ${gFmtCount}/${total}`);
  console.log('');

  if (Number(tPct) > Number(gPct)) {
    console.log(
      `  🏆 Motor TRADICIONAL rindió mejor en clasificación correcta (${tPct}% vs ${gPct}%).`,
    );
  } else if (Number(gPct) > Number(tPct)) {
    console.log(
      `  🏆 Motor GENERATIVO rindió mejor en clasificación correcta (${gPct}% vs ${tPct}%).`,
    );
  } else {
    console.log(`  🤝 Ambos motores obtuvieron el mismo porcentaje de acierto (${tPct}%).`);
  }

  console.log(
    '\n  Nota: Los casos adversariales validan la capa human-review.ts independientemente del motor de clasificación.',
  );
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
}

runBenchmark().catch((err) => {
  console.error('Error fatal en el benchmark:', err);
  process.exit(1);
});
