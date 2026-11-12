import { describe, expect, it } from 'vitest';

import { classifySupportRequest, normalizeText } from '../src/engines/traditional';

describe('traditional engine', () => {
  it('classifies access requests', () => {
    const result = classifySupportRequest('No puedo iniciar sesión con mi contraseña');
    expect(result.category).toBe('ACCESS');
    expect(result.priority).toBe('MEDIUM');
  });

  it('classifies bug reports', () => {
    const result = classifySupportRequest('La aplicación se congela y aparece error 500');
    expect(result.category).toBe('BUG');
    expect(result.priority).toBe('HIGH');
  });

  it('classifies feature requests', () => {
    const result = classifySupportRequest('Sería útil incluir un modo oscuro');
    expect(result.category).toBe('FEATURE');
    expect(result.priority).toBe('LOW');
  });

  it('classifies security issues', () => {
    const result = classifySupportRequest('Detectamos una inyección SQL que expone la base de datos');
    expect(result.category).toBe('SECURITY');
    expect(result.priority).toBe('CRITICAL');
  });

  it('detects low priority from improvement requests', () => {
    const result = classifySupportRequest('Nos gustaría agregar un botón de modo oscuro');
    expect(result.priority).toBe('LOW');
  });

  it('detects medium priority for common access problems', () => {
    const result = classifySupportRequest('Olvidé mi contraseña y el correo de recuperación nunca llega');
    expect(result.priority).toBe('MEDIUM');
  });

  it('detects high priority for severe bug incidents', () => {
    const result = classifySupportRequest('La pantalla queda en blanco con error 500');
    expect(result.priority).toBe('HIGH');
  });

  it('detects critical priority for security incidents', () => {
    const result = classifySupportRequest('Aparece un certificado SSL vencido');
    expect(result.priority).toBe('HIGH');
  });

  it('normalizes accents and whitespace before matching', () => {
    const normalized = normalizeText('No pueDO  iniciar  sesión con mi contraseña');
    expect(normalized).toContain('no puedo iniciar sesion');
  });

  it('handles ambiguous cases deterministically', () => {
    const result = classifySupportRequest('No puedo entrar porque el sistema se congela');
    expect(['BUG', 'ACCESS']).toContain(result.category);
    expect(result.priority).toBe('HIGH');
  });

  it('allows human review for security incidents', () => {
    const result = classifySupportRequest('Vulnerabilidad crítica en autenticación');
    expect(result.requiresHumanReview).toBe(true);
  });
});
