import 'server-only';
import type { AiProvider, AiCompletionRequest, AiCompletionResponse, AiProviderConfig } from '../types';

/**
 * OpenAI-compatible provider (also works for OpenRouter with baseUrl override).
 * Uses raw fetch — no dependency on the openai SDK.
 */
export function createOpenAiProvider(cfg: AiProviderConfig & { baseUrl?: string }): AiProvider {
  const baseUrl = cfg.baseUrl ?? 'https://api.openai.com/v1';
  const displayName = baseUrl.includes('openrouter') ? 'OpenRouter' : 'OpenAI';

  return {
    id: baseUrl.includes('openrouter') ? 'openrouter' : 'openai',
    displayName,
    async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
      const started = Date.now();
      const apiKey = cfg.apiKey;
      if (!apiKey) throw new Error(`${displayName} provider missing API key`);

      const model = req.model ?? cfg.model;
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: req.messages,
          temperature: req.temperature ?? cfg.temperature,
          max_tokens: req.maxTokens ?? cfg.maxTokens
        }),
        signal: req.signal
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${displayName} error ${res.status}: ${body.slice(0, 500)}`);
      }
      const data = (await res.json()) as OpenAiChatResponse;
      const text = data.choices?.[0]?.message?.content ?? '';
      const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
      const finish = data.choices?.[0]?.finish_reason ?? 'unknown';

      return {
        text,
        usage: {
          inputTokens: usage.prompt_tokens ?? 0,
          outputTokens: usage.completion_tokens ?? 0
        },
        model,
        provider: displayName.toLowerCase(),
        latencyMs: Date.now() - started,
        finishReason:
          finish === 'stop' || finish === 'length' || finish === 'content_filter' ? finish : 'unknown'
      };
    }
  };
}

type OpenAiChatResponse = {
  choices?: {
    message?: { content?: string };
    finish_reason?: string;
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};
