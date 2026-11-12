import { describe, expect, it } from 'vitest';

import { validateAnalyzeRequest, analyzeRequestSchema } from '../src/middleware/validator';

describe('validator', () => {
  it('accepts a valid request', () => {
    const parsed = analyzeRequestSchema.safeParse({
      message: 'No puedo iniciar sesión',
      mode: 'traditional',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects empty messages', () => {
    const parsed = analyzeRequestSchema.safeParse({
      message: '   ',
      mode: 'traditional',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects missing message', () => {
    const parsed = analyzeRequestSchema.safeParse({
      mode: 'traditional',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects invalid mode values', () => {
    const parsed = analyzeRequestSchema.safeParse({
      message: 'error in app',
      mode: 'invalid-mode',
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects overly long messages', () => {
    const parsed = analyzeRequestSchema.safeParse({
      message: 'a'.repeat(5001),
      mode: 'traditional',
    });

    expect(parsed.success).toBe(false);
  });

  it('returns a validation error when body is invalid in middleware', () => {
    const res = {
      status: () => ({
        json: () => undefined,
      }),
    };

    const result = validateAnalyzeRequest(
      { body: { message: '', mode: 'traditional' } } as any,
      res as any,
      () => undefined,
    );

    expect(result).toBe(false);
  });
});
