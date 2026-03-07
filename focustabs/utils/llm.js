// llm.js — LLM API client supporting OpenAI, Anthropic, and Gemini

const ENDPOINTS = {
  'gpt-5': 'https://api.openai.com/v1/chat/completions',
  'gpt-5-mini': 'https://api.openai.com/v1/chat/completions',
  'gpt-4o': 'https://api.openai.com/v1/chat/completions',
  'gpt-4o-mini': 'https://api.openai.com/v1/chat/completions',
  'claude-3-5-sonnet': 'https://api.anthropic.com/v1/messages',
  'gemini-pro': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
};

// Maps short model keys to the full versioned model IDs required by each API
const ANTHROPIC_MODEL_IDS = {
  'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
};

function parseLLMResponse(raw) {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error('Expected LLM response to be a JSON array, got: ' + typeof parsed);
  }

  // Validate item shape
  parsed.forEach((item, i) => {
    if (typeof item.index !== 'number') {
      throw new Error(`LLM response item ${i}: 'index' must be a number, got ${typeof item.index}`);
    }
    if (typeof item.relevant !== 'boolean') {
      throw new Error(`LLM response item ${i}: 'relevant' must be a boolean, got ${typeof item.relevant}`);
    }
  });

  return parsed;
}

async function callOpenAI({ apiKey, model, systemMessage, userMessage }) {
  const response = await fetch(ENDPOINTS[model], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`OpenAI returned an unexpected response shape: ${JSON.stringify(data)}`);
  return parseLLMResponse(content);
}

async function callAnthropic({ apiKey, model, systemMessage, userMessage }) {
  const anthropicModel = ANTHROPIC_MODEL_IDS[model] ?? model;

  const response = await fetch(ENDPOINTS[model], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: 1024,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text;
  if (!content) throw new Error(`Anthropic returned an unexpected response shape: ${JSON.stringify(data)}`);
  return parseLLMResponse(content);
}

async function callGemini({ apiKey, model, systemMessage, userMessage }) {
  // Gemini REST API uses API key as a query parameter (documented method for API key auth).
  // OAuth Bearer tokens are used for user-based auth, not API key auth.
  const url = `${ENDPOINTS[model]}?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemMessage + '\n\n' + userMessage }] }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error(`Gemini returned an unexpected response shape: ${JSON.stringify(data)}`);
  return parseLLMResponse(content);
}

async function callLLM({ model, apiKey, systemMessage, userMessage }) {
  if (model.startsWith('gpt-')) return callOpenAI({ apiKey, model, systemMessage, userMessage });
  if (model.startsWith('claude-')) return callAnthropic({ apiKey, model, systemMessage, userMessage });
  if (model.startsWith('gemini-')) return callGemini({ apiKey, model, systemMessage, userMessage });
  throw new Error(`Unsupported model: ${model}`);
}

module.exports = { callLLM, parseLLMResponse };
