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

// ── Additional parseLLMResponse tests ────────────────────────────────────────

describe('parseLLMResponse - additional', () => {
  test('returns empty array for empty JSON array', () => {
    const result = parseLLMResponse('[]');
    expect(result).toEqual([]);
  });

  test('throws when item index is not a number', () => {
    const raw = '[{"index":"0","relevant":false,"reason":"x"}]';
    expect(() => parseLLMResponse(raw)).toThrow(/index.*number/i);
  });

  test('throws when item relevant is not a boolean', () => {
    const raw = '[{"index":0,"relevant":"yes","reason":"x"}]';
    expect(() => parseLLMResponse(raw)).toThrow(/relevant.*boolean/i);
  });
});

// ── Anthropic provider tests ──────────────────────────────────────────────────

describe('callLLM - Anthropic', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('calls Anthropic endpoint for claude-3-5-sonnet', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: '[{"index":0,"relevant":true,"reason":"relevant"}]' }],
      }),
    });

    const result = await callLLM({
      model: 'claude-3-5-sonnet',
      apiKey: 'sk-ant-test',
      systemMessage: 'sys',
      userMessage: 'user',
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' })
    );
    // Verify the versioned model ID is used in the request body
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.model).toBe('claude-3-5-sonnet-20241022');
    expect(result).toHaveLength(1);
    expect(result[0].relevant).toBe(true);
  });

  test('throws on Anthropic non-ok response', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 429, text: async () => 'Rate limited' });
    await expect(
      callLLM({ model: 'claude-3-5-sonnet', apiKey: 'key', systemMessage: 's', userMessage: 'u' })
    ).rejects.toThrow('429');
  });
});

// ── Gemini provider tests ─────────────────────────────────────────────────────

describe('callLLM - Gemini', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('calls Gemini endpoint for gemini-pro', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '[{"index":0,"relevant":false,"reason":"off-topic"}]' }] } }],
      }),
    });

    const result = await callLLM({
      model: 'gemini-pro',
      apiKey: 'AIza-test',
      systemMessage: 'sys',
      userMessage: 'user',
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toHaveLength(1);
    expect(result[0].relevant).toBe(false);
  });

  test('throws on Gemini non-ok response', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' });
    await expect(
      callLLM({ model: 'gemini-pro', apiKey: 'key', systemMessage: 's', userMessage: 'u' })
    ).rejects.toThrow('403');
  });
});
