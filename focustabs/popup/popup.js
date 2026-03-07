// popup.js — FocusTabs popup controller

const $ = (sel) => document.querySelector(sel);

let currentSuggestions = [];

// ─── Tab navigation ───────────────────────────────────────────────────────────

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
    $(`#panel-${btn.dataset.tab}`).classList.remove("hidden");
    if (btn.dataset.tab === "archive") loadArchive();
  });
});

// ─── Settings ────────────────────────────────────────────────────────────────

$("#settings-btn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// ─── Idle state ──────────────────────────────────────────────────────────────

async function initIdle() {
  showState("idle");
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const activeTab = tabs.find((t) => t.active);
    $("#tab-count").textContent = `${tabs.length} tab${tabs.length !== 1 ? "s" : ""} open`;
    $("#focus-title").textContent = truncate(activeTab?.title ?? "Unknown", 40);
  } catch (err) {
    $("#tab-count").textContent = "Unable to count tabs";
  }
}

// ─── Analysis ────────────────────────────────────────────────────────────────

$("#analyze-btn").addEventListener("click", runAnalysis);
$("#retry-btn").addEventListener("click", runAnalysis);

async function runAnalysis() {
  showState("loading");
  try {
    const result = await sendMessage({ type: "ANALYZE" });
    if (result.error) throw new Error(result.error);
    currentSuggestions = result.suggestions ?? [];
    renderResults(currentSuggestions, result.focusTab);
  } catch (err) {
    showError(err.message);
  }
}

function renderResults(suggestions) {
  if (suggestions.length === 0) {
    $("#results-header").textContent = "All tabs look relevant to your current focus.";
    $("#suggestions-list").innerHTML = "";
    $("#archive-btn").disabled = true;
    $("#close-count").textContent = "0";
    showState("results");
    return;
  }

  $("#results-header").textContent = `Suggested to close (${suggestions.length}):`;
  const list = $("#suggestions-list");
  list.innerHTML = "";

  suggestions.forEach((s, i) => {
    const li = document.createElement("li");
    li.className = "suggestion-item";
    li.innerHTML = `
      <input type="checkbox" id="chk-${i}" checked />
      <label for="chk-${i}" class="suggestion-info">
        <div class="suggestion-title" title="${escapeHtml(s.title)}">${escapeHtml(truncate(s.title, 45))}</div>
        <div class="suggestion-reason">${escapeHtml(s.reason)}</div>
      </label>`;
    list.appendChild(li);
  });

  updateCloseCount();
  list.addEventListener("change", updateCloseCount);
  showState("results");
}

function updateCloseCount() {
  const checked = document.querySelectorAll("#suggestions-list input[type=checkbox]:checked").length;
  $("#close-count").textContent = checked;
  $("#archive-btn").disabled = checked === 0;
}

$("#archive-btn").addEventListener("click", async () => {
  const checked = [...document.querySelectorAll("#suggestions-list input[type=checkbox]:checked")];
  const indicesToClose = checked.map((cb) => parseInt(cb.id.replace("chk-", ""), 10));
  const tabsToClose = indicesToClose.map((i) => currentSuggestions[i]);
  const tabIds = tabsToClose.map((t) => t.tabId).filter(Boolean);

  if (tabIds.length === 0) return;

  $("#archive-btn").disabled = true;
  try {
    const result = await sendMessage({ type: "ARCHIVE_TABS", tabIds, tabs: tabsToClose });
    if (result.error) throw new Error(result.error);
    await initIdle();
  } catch (err) {
    showError(err.message);
  }
});

$("#cancel-btn").addEventListener("click", initIdle);

// ─── Archive panel ────────────────────────────────────────────────────────────

async function loadArchive() {
  const result = await sendMessage({ type: "GET_ARCHIVE" });
  const archive = result.archive ?? [];
  const list = $("#archive-list");
  const empty = $("#archive-empty");

  list.innerHTML = "";

  if (archive.length === 0) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  archive.forEach((item) => {
    const li = document.createElement("li");
    li.className = "archive-item";
    li.innerHTML = `
      <img class="archive-favicon" src="${escapeHtml(item.favicon || "")}" onerror="this.style.visibility=\'hidden\'" alt="" />
      <div class="archive-info">
        <div class="archive-title" title="${escapeHtml(item.url)}">${escapeHtml(truncate(item.title, 40))}</div>
        <div class="archive-time">${formatTimeAgo(item.archivedAt)}</div>
      </div>
      <button class="restore-btn" data-url="${escapeHtml(item.url)}">&#8617; Restore</button>`;
    list.appendChild(li);
  });

  // Use event delegation for restore buttons
  list.addEventListener("click", async (e) => {
    const btn = e.target.closest(".restore-btn");
    if (!btn) return;
    btn.disabled = true;
    const url = btn.dataset.url;
    await sendMessage({ type: "RESTORE_TAB", url });
    await loadArchive(); // refresh
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function showState(state) {
  ["idle", "loading", "error", "results"].forEach((s) => {
    $(`#state-${s}`).classList.toggle("hidden", s !== state);
  });
}

function showError(msg) {
  $("#error-msg").textContent = msg;
  showState("error");
}

function sendMessage(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

function truncate(str, max) {
  if (!str) return "";
  return str.length <= max ? str : str.slice(0, max) + "\u2026";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

initIdle();
