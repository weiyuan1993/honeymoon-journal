import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiClient } from '../gemini';

describe('GeminiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests structured JSON when a response schema is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"intro":"hello"}' }] } }],
      }))
    );
    vi.stubGlobal('fetch', fetchMock);

    const schema = {
      type: 'OBJECT',
      properties: {
        intro: { type: 'STRING' },
      },
      required: ['intro'],
    };
    const client = new GeminiClient({ GEMINI_API_KEY: 'test-key' });

    await client.generate({
      prompt: 'Write a journey',
      responseMimeType: 'application/json',
      responseSchema: schema,
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(request.body));

    expect(payload.generationConfig).toMatchObject({
      responseMimeType: 'application/json',
      responseSchema: schema,
    });
  });
});
