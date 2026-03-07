// storage.js — chrome.storage.local helpers

const DEFAULTS = {
  apiKey: '',
  model: 'gpt-4o',
};

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

async function getSettings() {
  const data = await storageGet(['apiKey', 'model']);
  return {
    apiKey: data.apiKey ?? DEFAULTS.apiKey,
    model: data.model ?? DEFAULTS.model,
  };
}

async function saveSettings({ apiKey, model }) {
  await storageSet({ apiKey, model });
}

async function addDecision(decision) {
  const data = await storageGet(['decisions']);
  const decisions = data.decisions ?? [];
  decisions.push(decision);
  await storageSet({ decisions });
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
