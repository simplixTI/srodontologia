import 'server-only';
import type { AiProvider, AiCompletionRequest, AiCompletionResponse, AiProviderConfig } from '../types';

/**
 * Anthropic Messages API adapter. Raw fetch, no SDK.
 * Converts our `system|user|assistant` message list to Anthropic's format
 * (system as top-level string; only user/assistant in `messages`).
 */
export function createAnthropicProvider(cfg: AiProviderConfig): AiProvider {
  return {
    id: 'anthropic',
    displayName: 'Anthropic',
    async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
      const started = Date.now();
      const apiKey = cfg.apiKey;
      if (!apiKey) throw new Error('Anthropic provider missing API key');

      const model = req.model ?? cfg.model;
      const system =
        req.messages
          .filter((m) => m.role === 'system')
          .map((m) => m.content)
          .join('\n\n') || undefined;
      const nonSystem = req.messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          system,
          messages: nonSystem,
          max_tokens: req.maxTokens ?? cfg.maxTokens,
          temperature: req.temperature ?? cfg.temperature
        }),
        signal: req.signal
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Anthropic error ${res.status}: ${body.slice(0, 500)}`);
      }
      const data = (await res.json()) as AnthropicResponse;
      const text = data.content?.[0]?.text ?? '';
      const usage = data.usage ?? { input_tokens: 0, output_tokens: 0 };
      const finish = data.stop_reason ?? 'unknown';

      return {
        text,
        usage: {
          inputTokens: usage.input_tokens ?? 0,
          outputTokens: usage.output_tokens ?? 0
        },
        model,
        provider: 'anthropic',
        latencyMs: Date.now() - started,
        finishReason: finish === 'end_turn' ? 'stop' : finish === 'max_tokens' ? 'length' : 'unknown'
      };
    }
  };
}

type AnthropicResponse = {
  content?: { type?: string; text?: string }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
};
