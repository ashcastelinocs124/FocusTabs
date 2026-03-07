// storage.js — chrome.storage.local helpers

const DEFAULTS = {
  apiKey: '',
  model: 'gpt-4o',
};

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
  return {
    apiKey: data.apiKey ?? DEFAULTS.apiKey,
    model: data.model ?? DEFAULTS.model,
  };
}

async function saveSettings({ apiKey = DEFAULTS.apiKey, model = DEFAULTS.model } = {}) {
  await storageSet({ apiKey, model });
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

module.exports = { getSettings, saveSettings, addDecision, getDecisions, addToArchive, getArchive, removeFromArchive };
