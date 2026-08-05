import 'server-only';
import type { OcrProvider, OcrRunResult, OcrRunInput } from '../types';

/**
 * Mock OCR provider. Deterministic output so the review UI + review action
 * can be exercised end-to-end without a real OCR backend.
 */
export function createMockOcrProvider(): OcrProvider {
  return {
    id: 'mock',
    displayName: 'Mock OCR (offline)',
    async extract(input: OcrRunInput): Promise<OcrRunResult> {
      const stem = input.file.original_name.replace(/\.[^.]+$/, '');
      return {
        rawText: `[OCR OFFLINE] Conteúdo extraído automaticamente do arquivo "${stem}". Este é um resultado simulado — configure um provedor real em /admin/integracoes.`,
        fields: {
          patient_name: 'Paciente Simulado',
          request_date: new Date().toISOString().slice(0, 10),
          work_type: input.target === 'clinical_form' ? 'ficha_clinica' : 'documento',
          observations: 'Preenchimento automático simulado — revise antes de salvar.'
        },
        confidence: 0.5,
        provider: 'mock',
        model: 'mock-1'
      };
    }
  };
}
