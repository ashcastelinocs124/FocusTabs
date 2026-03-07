// background.js — service worker
// Handles messages from popup and orchestrates tab analysis.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE') {
    handleAnalyze()
      .then(sendResponse)
      .catch((err) => sendResponse({ status: 'error', message: err.message }));
    return true;
  }
  if (message.type === 'ARCHIVE_TABS') {
    handleArchive(message.tabIds, message.tabs)
      .then(sendResponse)
      .catch((err) => sendResponse({ status: 'error', message: err.message }));
    return true;
  }
  if (message.type === 'RESTORE_TAB') {
    handleRestore(message.url)
      .then(sendResponse)
      .catch((err) => sendResponse({ status: 'error', message: err.message }));
    return true;
  }
  // Unknown message type — don't leave callers hanging
  sendResponse({ status: 'error', message: `Unknown message type: ${message.type}` });
  return false;
});

async function handleAnalyze() {
  return { status: 'ok', suggestions: [] }; // stub
}

// tabs: array of { tabId, url, title, favicon }
async function handleArchive(tabIds, tabs) {
  return { status: 'ok' }; // stub
}

async function handleRestore(url) {
  return { status: 'ok' }; // stub
}
