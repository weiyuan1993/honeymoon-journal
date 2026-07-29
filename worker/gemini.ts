import { fetchWithRetry } from './retry';

export interface GeminiEnv {
  GEMINI_API_KEY: string;
  GEMINI_TEXT_MODEL?: string;
  GEMINI_SEARCH_MODEL?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable = status === 429 || status >= 500
  ) {
    super(message);
  }
}

export class GeminiClient {
  constructor(private readonly env: GeminiEnv) {}

  async generate(options: {
    prompt?: string;
    systemPrompt?: string;
    history?: Array<{ role: 'user' | 'model'; text: string }>;
    question?: string;
    search?: boolean;
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
  }): Promise<string> {
    if (!this.env.GEMINI_API_KEY) throw new GeminiError('Gemini API Key 未設定', 503, false);
    const model = options.search
      ? this.env.GEMINI_SEARCH_MODEL || 'gemini-2.5-flash-lite'
      : this.env.GEMINI_TEXT_MODEL || 'gemini-3.1-flash-lite';
    const contents = options.history?.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    })) ?? [];
    if (options.prompt) contents.push({ role: 'user', parts: [{ text: options.prompt }] });
    if (options.question) contents.push({ role: 'user', parts: [{ text: options.question }] });

    const generationConfig: Record<string, unknown> = {
      temperature: options.temperature ?? 0.8,
      maxOutputTokens: options.maxOutputTokens ?? 8192,
    };
    if (options.responseMimeType) {
      generationConfig.responseMimeType = options.responseMimeType;
    }
    if (options.responseSchema) {
      generationConfig.responseSchema = options.responseSchema;
    }

    const payload: Record<string, unknown> = {
      contents,
      generationConfig,
    };
    if (options.systemPrompt) {
      payload.system_instruction = { parts: [{ text: options.systemPrompt }] };
    }
    if (options.search) payload.tools = [{ google_search: {} }];

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { attempts: 3, baseDelayMs: 250 }
    );
    const result = await response.json() as GeminiResponse;
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!response.ok || !text) {
      throw new GeminiError(
        result.error?.message || `Gemini request failed (${response.status})`,
        response.status
      );
    }
    return text;
  }
}
