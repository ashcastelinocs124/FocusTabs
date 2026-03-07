const { callLLM, parseLLMResponse } = require('../utils/llm');

describe('parseLLMResponse', () => {
  test('parses valid JSON array', () => {
    const raw = '[{"index":0,"relevant":false,"reason":"Shopping"},{"index":1,"relevant":true,"reason":"Docs"}]';
    const result = parseLLMResponse(raw);
    expect(result).toHaveLength(2);
    expect(result[0].relevant).toBe(false);
    expect(result[0].reason).toBe('Shopping');
    expect(result[1].relevant).toBe(true);
  });

  test('strips markdown code fences before parsing', () => {
    const raw = '```json\n[{"index":0,"relevant":false,"reason":"x"}]\n```';
    const result = parseLLMResponse(raw);
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(0);
  });

  test('strips plain code fences (no language tag)', () => {
    const raw = '```\n[{"index":0,"relevant":true,"reason":"y"}]\n```';
    const result = parseLLMResponse(raw);
    expect(result).toHaveLength(1);
  });

  test('throws on completely invalid JSON', () => {
    expect(() => parseLLMResponse('not json at all')).toThrow();
  });

  test('throws on valid JSON but not an array', () => {
    expect(() => parseLLMResponse('{"index":0}')).toThrow(/array/i);
  });
});

describe('callLLM', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('calls OpenAI endpoint for gpt-4o', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '[{"index":0,"relevant":false,"reason":"x"}]' } }],
      }),
    });

    const result = await callLLM({ model: 'gpt-4o', apiKey: 'sk-test', systemMessage: 'sys', userMessage: 'user' });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toHaveLength(1);
    expect(result[0].relevant).toBe(false);
  });

  test('calls OpenAI endpoint for gpt-4o-mini', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '[{"index":0,"relevant":true,"reason":"y"}]' } }],
      }),
    });

    await callLLM({ model: 'gpt-4o-mini', apiKey: 'sk-test', systemMessage: 'sys', userMessage: 'user' });
    expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.anything());
  });

  test('throws descriptive error on non-ok HTTP response', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(
      callLLM({ model: 'gpt-4o', apiKey: 'bad-key', systemMessage: 's', userMessage: 'u' })
    ).rejects.toThrow('401');
  });

  test('throws for unsupported model', async () => {
    await expect(
      callLLM({ model: 'unknown-model-xyz', apiKey: 'key', systemMessage: 's', userMessage: 'u' })
    ).rejects.toThrow(/unsupported model/i);
  });
});
