import { describe, expect, it } from 'vitest';
import type { GoogleGenAI } from '@google/genai';

import {
  classifyWithGenerativeAI,
  generativeOutputSchema,
} from '../src/engines/generative';

describe('Motor Generativo - Integrante 2', () => {
  describe('Validación de esquema de salida (Zod)', () => {
    it('debe aceptar un objeto que cumpla exactamente el esquema', () => {
      const valid = {
        category: 'ACCESS',
        priority: 'MEDIUM',
        response: 'Lamentamos el inconveniente con su contraseña. Puede restablecerla en el portal.',
        requiresHumanReview: false,
      };

      const result = generativeOutputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('debe rechazar categorías o prioridades que no pertenezcan al enum', () => {
      const invalidCategory = {
        category: 'BILLING',
        priority: 'LOW',
        response: 'Consulta de cobro.',
        requiresHumanReview: false,
      };
      expect(generativeOutputSchema.safeParse(invalidCategory).success).toBe(false);

      const invalidPriority = {
        category: 'BUG',
        priority: 'URGENT',
        response: 'Error 500.',
        requiresHumanReview: false,
      };
      expect(generativeOutputSchema.safeParse(invalidPriority).success).toBe(false);
    });

    it('debe rechazar respuestas vacías o campos faltantes', () => {
      const emptyResponse = {
        category: 'FEATURE',
        priority: 'LOW',
        response: '',
        requiresHumanReview: false,
      };
      expect(generativeOutputSchema.safeParse(emptyResponse).success).toBe(false);

      const missingFields = {
        category: 'BUG',
      };
      expect(generativeOutputSchema.safeParse(missingFields).success).toBe(false);
    });
  });

  describe('Manejo de errores del proveedor y configuración', () => {
    it('debe lanzar error claro cuando no hay API Key configurada', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        await expect(classifyWithGenerativeAI('No puedo entrar')).rejects.toThrow(
          /GEMINI_API_KEY no está configurada/,
        );
      } finally {
        if (originalKey) {
          process.env.GEMINI_API_KEY = originalKey;
        }
      }
    });

    it('debe capturar y propagar errores del proveedor de IA', async () => {
      const mockClient = {
        models: {
          generateContent: async () => {
            throw new Error('API quota exceeded (HTTP 429)');
          },
        },
      } as unknown as GoogleGenAI;

      await expect(
        classifyWithGenerativeAI('Error en el sistema', { client: mockClient }),
      ).rejects.toThrow(/Error en el proveedor de IA Generativa: API quota exceeded/);
    });

    it('debe rechazar respuestas del modelo que no sean un JSON válido', async () => {
      const mockClient = {
        models: {
          generateContent: async () => ({
            text: 'Disculpa, como modelo de lenguaje no puedo ayudarte.',
          }),
        },
      } as unknown as GoogleGenAI;

      await expect(
        classifyWithGenerativeAI('No puedo entrar', { client: mockClient }),
      ).rejects.toThrow(/La respuesta de la IA generativa no es un JSON válido/);
    });
  });

  describe('Cumplimiento del contrato y reglas de seguridad', () => {
    it('debe procesar una respuesta generativa válida respetando el contrato AnalyzeResponse', async () => {
      const mockClient = {
        models: {
          generateContent: async () => ({
            text: JSON.stringify({
              category: 'BUG',
              priority: 'HIGH',
              response: 'Identificamos un error 500 al procesar la solicitud. Nuestro equipo técnico está investigando.',
              requiresHumanReview: false,
            }),
          }),
        },
      } as unknown as GoogleGenAI;

      const result = await classifyWithGenerativeAI('La pantalla se queda en blanco con error 500', {
        client: mockClient,
      });

      expect(result).toEqual({
        category: 'BUG',
        priority: 'HIGH',
        response: 'Identificamos un error 500 al procesar la solicitud. Nuestro equipo técnico está investigando.',
        requiresHumanReview: false,
        mode: 'generative',
      });
    });

    it('debe forzar requiresHumanReview: true si la categoría es SECURITY aunque el modelo devuelva false', async () => {
      const mockClient = {
        models: {
          generateContent: async () => ({
            text: JSON.stringify({
              category: 'SECURITY',
              priority: 'HIGH',
              response: 'Hemos registrado un posible intento de inyección SQL en la base de datos.',
              requiresHumanReview: false, // El modelo intentó omitirlo
            }),
          }),
        },
      } as unknown as GoogleGenAI;

      const result = await classifyWithGenerativeAI('Detectamos una inyección SQL en el login', {
        client: mockClient,
      });

      expect(result.category).toBe('SECURITY');
      expect(result.requiresHumanReview).toBe(true);
    });

    it('debe forzar requiresHumanReview: true si la prioridad es CRITICAL', async () => {
      const mockClient = {
        models: {
          generateContent: async () => ({
            text: JSON.stringify({
              category: 'BUG',
              priority: 'CRITICAL',
              response: 'Caída total de los servidores de producción.',
              requiresHumanReview: false,
            }),
          }),
        },
      } as unknown as GoogleGenAI;

      const result = await classifyWithGenerativeAI('Servidores caídos por completo', {
        client: mockClient,
      });

      expect(result.priority).toBe('CRITICAL');
      expect(result.requiresHumanReview).toBe(true);
    });
  });
});
