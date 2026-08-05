import 'server-only';
import type { AiProvider, AiCompletionRequest, AiCompletionResponse } from '../types';

/**
 * Deterministic mock provider. Never calls the network.
 * Used when no real provider is configured or during tests.
 *
 * The response is a legible template so UX is testable end-to-end
 * without needing external API keys.
 */
export function createMockProvider(): AiProvider {
  return {
    id: 'mock',
    displayName: 'Mock (offline)',
    async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
      const started = Date.now();
      const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
      const feature = req.feature;
      const text = renderMockAnswer(feature, lastUser?.content ?? '');
      const inputTokens = estimateTokens(req.messages.map((m) => m.content).join('\n'));
      const outputTokens = estimateTokens(text);

      // Small artificial delay so async orchestration looks realistic in dev
      await new Promise((r) => setTimeout(r, 15));

      return {
        text,
        usage: { inputTokens, outputTokens, costEstimate: 0 },
        model: req.model ?? 'mock-1',
        provider: 'mock',
        latencyMs: Date.now() - started,
        finishReason: 'stop'
      };
    }
  };
}

function estimateTokens(s: string): number {
  return Math.max(1, Math.ceil(s.length / 4));
}

function renderMockAnswer(feature: string, userText: string): string {
  const first = userText.slice(0, 240).trim();
  switch (feature) {
    case 'case_summary':
      return [
        '**Resumo automático (modo offline)**',
        '- Caso em andamento sem eventos críticos identificados.',
        '- Últimas ações registradas na timeline.',
        '- Pendências: verifique checklist obrigatório.',
        '- Próximos passos sugeridos: revisar orçamento, confirmar prazo.'
      ].join('\n');
    case 'lab_assistant':
      return `Ainda não há um provedor de IA configurado. Sua pergunta foi: "${first}". Configure em /admin/ai.`;
    case 'dentist_assistant':
      return 'Nossa assistente ainda está em modo demonstração. Em breve responderemos dúvidas sobre seus casos, aprovações e envio de arquivos.';
    case 'prazo_prediction':
      return JSON.stringify({ estimated_days: 7, confidence: 0.5, source: 'mock' });
    default:
      return `[mock:${feature}] ${first}`;
  }
}
