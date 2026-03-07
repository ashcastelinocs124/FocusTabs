// settings.js — FocusTabs options page

const modelSelect = document.getElementById('model-select');
const apiKeyInput = document.getElementById('api-key');
const saveBtn = document.getElementById('save-btn');
const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error-msg');

// Load saved settings on open
async function loadSettings() {
  try {
    const data = await new Promise((resolve, reject) =>
      chrome.storage.local.get(['apiKey', 'model'], (result) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(result);
      })
    );
    apiKeyInput.value = data.apiKey ?? '';
    modelSelect.value = data.model ?? 'gpt-4o';
  } catch (err) {
    showError('Failed to load settings: ' + err.message);
  }
}

// Save settings on button click
saveBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;

  hideMessages();

  if (!apiKey) {
    showError('Please enter an API key before saving.');
    return;
  }

  saveBtn.disabled = true;

  try {
    await new Promise((resolve, reject) =>
      chrome.storage.local.set({ apiKey, model }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      })
    );
    showStatus('✓ Saved');
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
