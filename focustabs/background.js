// background.js — service worker
// Handles messages from popup and orchestrates tab analysis.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE') {
    handleAnalyze().then(sendResponse);
    return true;
  }
  if (message.type === 'ARCHIVE_TABS') {
    handleArchive(message.tabIds, message.tabs).then(sendResponse);
    return true;
  }
  if (message.type === 'RESTORE_TAB') {
    handleRestore(message.url).then(sendResponse);
    return true;
  }
});

async function handleAnalyze() {
  return { status: 'ok', suggestions: [] };
}

async function handleArchive(tabIds, tabs) {
  return { status: 'ok' };
}

async function handleRestore(url) {
  return { status: 'ok' };
}
