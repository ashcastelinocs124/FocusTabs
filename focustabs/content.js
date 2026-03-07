// content.js — reference file showing what gets injected per tab.
// Actual injection uses chrome.scripting.executeScript with an inline func.

(function () {
  const title = document.title;
  const url = window.location.href;
  const metaDesc =
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    '';
  const bodyText = document.body?.innerText?.slice(0, 1500) || '';
  const summary = (metaDesc + ' ' + bodyText).trim().slice(0, 500);
  return { title, url, summary };
})();
