// settings.js — FocusTabs options page

const modelSelect = document.getElementById('model-select');
const apiKeyInput = document.getElementById('api-key');
const saveBtn = document.getElementById('save-btn');
const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error-msg');
const autoPromptEnabledInput = document.getElementById('auto-prompt-enabled');

const DEFAULT_MODEL = 'gpt-5-mini';
const MODEL_PROVIDER = {
  'gpt-5': 'openai',
  'gpt-5-mini': 'openai',
  'gpt-4o': 'openai',
  'gpt-4o-mini': 'openai',
  'claude-3-5-sonnet': 'anthropic',
  'gemini-pro': 'gemini',
};
const DEFAULT_MODEL_BY_PROVIDER = {
  openai: 'gpt-5-mini',
  anthropic: 'claude-3-5-sonnet',
  gemini: 'gemini-pro',
};

function detectProviderFromApiKey(apiKey) {
  if (!apiKey) return null;
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  if (apiKey.startsWith('AIza')) return 'gemini';
  if (apiKey.startsWith('sk-')) return 'openai';
  return null;
}

function normalizeModelForUser({ apiKey, model }) {
  const requestedModel = model ?? DEFAULT_MODEL;
  const modelProvider = MODEL_PROVIDER[requestedModel];
  const keyProvider = detectProviderFromApiKey(apiKey);

  if (!modelProvider) return keyProvider ? DEFAULT_MODEL_BY_PROVIDER[keyProvider] : DEFAULT_MODEL;
  if (keyProvider && keyProvider !== modelProvider) return DEFAULT_MODEL_BY_PROVIDER[keyProvider];
  return requestedModel;
}

function getModelLabel(model) {
  const option = modelSelect.querySelector(`option[value="${model}"]`);
  return option ? option.textContent : model;
}

// Load saved settings on open
async function loadSettings() {
  try {
    const data = await new Promise((resolve, reject) =>
      chrome.storage.local.get(['apiKey', 'model', 'autoPromptEnabled'], (result) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(result);
      })
    );
    const apiKey = data.apiKey ?? '';
    const model = normalizeModelForUser({ apiKey, model: data.model });
    apiKeyInput.value = apiKey;
    modelSelect.value = model;
    autoPromptEnabledInput.checked = Boolean(data.autoPromptEnabled);
  } catch (err) {
    showError('Failed to load settings: ' + err.message);
  }
}

// Save settings on button click
saveBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;
  const normalizedModel = normalizeModelForUser({ apiKey, model });
  const autoPromptEnabled = autoPromptEnabledInput.checked;

  hideMessages();

  if (!apiKey) {
    showError('Please enter an API key before saving.');
    return;
  }

  saveBtn.disabled = true;

  try {
    await new Promise((resolve, reject) =>
      chrome.storage.local.set({ apiKey, model: normalizedModel, autoPromptEnabled }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      })
    );
    modelSelect.value = normalizedModel;
    if (normalizedModel !== model) {
      showStatus(`Saved - switched to ${getModelLabel(normalizedModel)} for this API key`);
    } else {
      showStatus('Saved');
    }
  } catch (err) {
    showError('Failed to save: ' + err.message);
  } finally {
    saveBtn.disabled = false;
  }
});

function showStatus(msg) {
  statusEl.textContent = msg;
  statusEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  setTimeout(() => statusEl.classList.add('hidden'), 2500);
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
  statusEl.classList.add('hidden');
}

function hideMessages() {
  statusEl.classList.add('hidden');
  errorEl.classList.add('hidden');
}

loadSettings();
