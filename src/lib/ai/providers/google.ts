import 'server-only';
import type { AiProvider, AiCompletionRequest, AiCompletionResponse, AiProviderConfig } from '../types';

/** Google Gemini adapter (v1beta REST). */
export function createGoogleProvider(cfg: AiProviderConfig): AiProvider {
  return {
    id: 'google',
    displayName: 'Google Gemini',
    async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
      const started = Date.now();
      if (!cfg.apiKey) throw new Error('Google provider missing API key');
      const model = req.model ?? cfg.model;

      const systemInstruction =
        req.messages
          .filter((m) => m.role === 'system')
          .map((m) => m.content)
          .join('\n\n') || undefined;

      const contents = req.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          contents,
          generationConfig: {
            temperature: req.temperature ?? cfg.temperature,
            maxOutputTokens: req.maxTokens ?? cfg.maxTokens
          }
        }),
        signal: req.signal
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Google error ${res.status}: ${body.slice(0, 500)}`);
      }
      const data = (await res.json()) as GoogleResponse;
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      const usage = data.usageMetadata ?? { promptTokenCount: 0, candidatesTokenCount: 0 };

      return {
        text,
        usage: {
          inputTokens: usage.promptTokenCount ?? 0,
          outputTokens: usage.candidatesTokenCount ?? 0
        },
        model,
        provider: 'google',
        latencyMs: Date.now() - started,
        finishReason: 'stop'
      };
    }
  };
}

type GoogleResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};
