// storage.js — chrome.storage.local helpers

const DEFAULTS = {
  apiKey: '',
  model: 'gpt-5-mini',
};

const MODELS = {
  OPENAI: ['gpt-5', 'gpt-5-mini', 'gpt-4o', 'gpt-4o-mini'],
  ANTHROPIC: ['claude-3-5-sonnet'],
  GEMINI: ['gemini-pro'],
};

const DEFAULT_MODEL_BY_PROVIDER = {
  openai: 'gpt-5-mini',
  anthropic: 'claude-3-5-sonnet',
  gemini: 'gemini-pro',
};

function getProviderForModel(model) {
  if (MODELS.OPENAI.includes(model)) return 'openai';
  if (MODELS.ANTHROPIC.includes(model)) return 'anthropic';
  if (MODELS.GEMINI.includes(model)) return 'gemini';
  return null;
}

function detectProviderFromApiKey(apiKey) {
  if (!apiKey) return null;
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('AIza')) return 'gemini';
  if (apiKey.startsWith('sk-')) return 'openai';
  return null;
}

function normalizeModelForUser({ apiKey, model }) {
  const requestedModel = model ?? DEFAULTS.model;
  const modelProvider = getProviderForModel(requestedModel);
  const keyProvider = detectProviderFromApiKey(apiKey);

  if (!modelProvider) {
    return keyProvider ? DEFAULT_MODEL_BY_PROVIDER[keyProvider] : DEFAULTS.model;
  }

  if (keyProvider && keyProvider !== modelProvider) {
    return DEFAULT_MODEL_BY_PROVIDER[keyProvider];
  }

  return requestedModel;
}

const DECISIONS_CAP = 100; // max stored decisions

function storageGet(keys) {
  return new Promise((resolve, reject) =>
    chrome.storage.local.get(keys, (data) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(data);
    })
  );
}

function storageSet(obj) {
  return new Promise((resolve, reject) =>
    chrome.storage.local.set(obj, () => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve();
    })
  );
}

async function getSettings() {
  const data = await storageGet(['apiKey', 'model']);
  const apiKey = data.apiKey ?? DEFAULTS.apiKey;
  return {
    apiKey,
    model: normalizeModelForUser({ apiKey, model: data.model }),
  };
}

async function saveSettings({ apiKey = DEFAULTS.apiKey, model = DEFAULTS.model } = {}) {
  await storageSet({ apiKey, model: normalizeModelForUser({ apiKey, model }) });
}

async function addDecision(decision) {
  const data = await storageGet(['decisions']);
  const decisions = data.decisions ?? [];
  decisions.push(decision);
  await storageSet({ decisions: decisions.slice(-DECISIONS_CAP) }); // keep last 100
}

async function getDecisions() {
  const data = await storageGet(['decisions']);
  const decisions = data.decisions ?? [];
  return decisions.slice(-20).reverse(); // last 20, most recent first
}

async function addToArchive(entry) {
  const data = await storageGet(['archive']);
  const archive = data.archive ?? [];
  archive.unshift(entry);
  await storageSet({ archive });
}

async function getArchive() {
  const data = await storageGet(['archive']);
  return data.archive ?? [];
}

async function removeFromArchive(url) {
  const data = await storageGet(['archive']);
  const archive = (data.archive ?? []).filter((e) => e.url !== url);
  await storageSet({ archive });
}

module.exports = {
  getSettings,
  saveSettings,
  addDecision,
  getDecisions,
  addToArchive,
  getArchive,
  removeFromArchive,
  detectProviderFromApiKey,
  getProviderForModel,
  normalizeModelForUser,
};
