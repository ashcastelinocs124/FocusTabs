// popup.js — FocusTabs popup controller

const $ = (sel) => document.querySelector(sel);
const ANALYZE_TAB_THRESHOLD = 10;

let currentSuggestions = [];
let chatHistory = [];

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
    updateAnalyzeGate(tabs.length);
    $("#tab-count").textContent = `${tabs.length} tab${tabs.length !== 1 ? "s" : ""} open`;
    $("#focus-title").textContent = truncate(activeTab?.title ?? "Unknown", 40);
  } catch (err) {
    updateAnalyzeGate(0);
    $("#tab-count").textContent = "Unable to count tabs";
  }
}

// ─── Analysis ────────────────────────────────────────────────────────────────

$("#analyze-btn").addEventListener("click", runAnalysis);
$("#retry-btn").addEventListener("click", runAnalysis);
$("#chat-send-btn").addEventListener("click", runChat);

async function runAnalysis() {
  if ($("#analyze-btn").disabled) return;
  showState("loading");
  try {
    const settings = await getFrontendSettings();
    const result = await sendMessage({ type: "ANALYZE", ...settings });
    if (result.error) throw new Error(result.error);
    currentSuggestions = result.suggestions ?? [];
    renderResults(currentSuggestions, result.focusTab);
  } catch (err) {
    showError(err.message);
  }
}

async function runChat() {
  resetChatHistoryIfNeeded();
  const query = $("#chat-query").value.trim();
  if (!query) {
    showChatError("Enter a question to analyze your open tabs.");
    return;
  }

  hideChatMessages();
  const btn = $("#chat-send-btn");
  btn.disabled = true;
  btn.textContent = "Asking...";
  appendChatMessage("user", query);
  chatHistory.push({ role: "user", text: query });
  $("#chat-query").value = "";
  const pendingNode = appendChatMessage("assistant", "Analyzing open tabs...");

  try {
    const settings = await getFrontendSettings();
    const result = await sendMessage({ type: "CHAT_TABS", query, history: chatHistory, ...settings });
    if (result.error) throw new Error(result.error);
    const answer = result.answer ?? "";
    updateAssistantMessage(pendingNode, answer, result.relevantTabs ?? []);
    chatHistory.push({ role: "assistant", text: answer });
  } catch (err) {
    const errorReply = `I couldn't complete that request: ${err.message}`;
    updateAssistantMessage(pendingNode, errorReply, []);
    chatHistory.push({ role: "assistant", text: errorReply });
    showChatError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Ask All Tabs";
  }
}

function updateAnalyzeGate(tabCount) {
  const analyzeBtn = $("#analyze-btn");
  const gateMsg = $("#analyze-gate-msg");
  const overThreshold = tabCount > ANALYZE_TAB_THRESHOLD;
  analyzeBtn.disabled = !overThreshold;

  if (overThreshold) {
    gateMsg.textContent = `You have ${tabCount} tabs open. Ready to analyze and clean up?`;
    return;
  }

  const needed = ANALYZE_TAB_THRESHOLD + 1 - tabCount;
  gateMsg.textContent = `Open ${needed} more tab${needed === 1 ? "" : "s"} to unlock analysis (starts at 11+ tabs).`;
}

function appendChatMessage(role, text) {
  const thread = $("#chat-thread");
  const item = document.createElement("div");
  item.className = `chat-msg ${role}`;
  item.textContent = text;
  thread.appendChild(item);
  thread.scrollTop = thread.scrollHeight;
  return item;
}

function updateAssistantMessage(node, answer, relevantTabs) {
  node.textContent = answer || "No response returned.";
  if (relevantTabs.length > 0) {
    const list = document.createElement("ul");
    list.className = "chat-tabs-list";
    relevantTabs.forEach((tab) => {
      const li = document.createElement("li");
      li.className = "chat-tab-item";
      li.innerHTML = `
        <div>${escapeHtml(truncate(tab.title || tab.url || "Untitled tab", 60))}</div>
        <div class="chat-tab-url">${escapeHtml(tab.url || "")}</div>
      `;
      list.appendChild(li);
    });
    node.appendChild(list);
  }
  const thread = $("#chat-thread");
  thread.scrollTop = thread.scrollHeight;
}

function showChatError(msg) {
  const el = $("#chat-error-msg");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideChatMessages() {
  $("#chat-error-msg").classList.add("hidden");
}

function resetChatHistoryIfNeeded() {
  if (chatHistory.length > 20) {
    chatHistory = chatHistory.slice(-20);
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

    // Build img via DOM property (avoids javascript: URI injection via innerHTML attribute)
    const img = document.createElement("img");
    img.className = "archive-favicon";
    img.src = item.favicon || "";
    img.alt = "";
    img.onerror = () => { img.style.visibility = "hidden"; };

    const info = document.createElement("div");
    info.className = "archive-info";
    info.innerHTML = `
      <div class="archive-title" title="${escapeHtml(item.url)}">${escapeHtml(truncate(item.title, 40))}</div>
      <div class="archive-time">${formatTimeAgo(item.archivedAt)}</div>`;

    const btn = document.createElement("button");
    btn.className = "restore-btn";
    btn.dataset.url = item.url;
    btn.textContent = "↩ Restore";

    li.appendChild(img);
    li.appendChild(info);
    li.appendChild(btn);
    list.appendChild(li);
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
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ error: chrome.runtime.lastError.message });
      } else {
        resolve(response ?? {});
      }
    });
  });
}

function getFrontendSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiKey", "model", "userContext"], (data) => {
      if (chrome.runtime.lastError) {
        resolve({});
        return;
      }
      resolve({
        apiKey: data.apiKey ?? "",
        model: data.model ?? "gpt-5-mini",
        userContext: data.userContext ?? "",
      });
    });
  });
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
  if (!ts || isNaN(ts)) return "unknown";
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

// Register archive restore listener once (event delegation)
$("#archive-list").addEventListener("click", async (e) => {
  const btn = e.target.closest(".restore-btn");
  if (!btn) return;
  btn.disabled = true;
  const url = btn.dataset.url;
  await sendMessage({ type: "RESTORE_TAB", url });
  await loadArchive();
});

// Register suggestions change listener once
$("#suggestions-list").addEventListener("change", updateCloseCount);
$("#chat-query").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    resetChatHistoryIfNeeded();
    runChat();
  }
});

initIdle();
