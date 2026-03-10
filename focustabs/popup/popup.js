// popup.js — FocusTabs popup controller

const $ = (sel) => document.querySelector(sel);
const ANALYZE_TAB_THRESHOLD = 5;
const WORKFLOW_RECENT_OPTION_COUNT = 3;

let currentSuggestions = [];
let chatHistory = [];
let workflowOptions = [];

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
  hideWorkflowPicker();
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

$("#analyze-btn").addEventListener("click", startWorkflowSelection);
$("#retry-btn").addEventListener("click", startWorkflowSelection);
$("#chat-send-btn").addEventListener("click", runChat);
$("#workflow-confirm-btn").addEventListener("click", confirmWorkflowSelection);
$("#workflow-cancel-btn").addEventListener("click", cancelWorkflowSelection);
$("#workflow-custom-input").addEventListener("input", () => {
  if ($("#workflow-custom-input").value.trim()) {
    $("#workflow-option-custom").checked = true;
  }
  hideWorkflowPickerError();
});

async function startWorkflowSelection() {
  if ($("#analyze-btn").disabled) return;
  showState("idle");
  hideWorkflowPickerError();
  try {
    const settings = await getFrontendSettings();
    const response = await sendMessage({ type: "GET_WORKFLOW_RECOMMENDATIONS", useAI: false, ...settings });
    if (response.error) throw new Error(response.error);
    const options = Array.isArray(response.workflowOptions) ? response.workflowOptions : [];
    workflowOptions = options.slice(0, WORKFLOW_RECENT_OPTION_COUNT).map((item, idx) => ({
      key: String(idx),
      name: item?.name || `Workflow ${idx + 1}`,
      confidence: Number(item?.confidence) || 0,
      evidence: item?.evidence || "Based on your recent tab activity.",
    }));
    while (workflowOptions.length < WORKFLOW_RECENT_OPTION_COUNT) {
      workflowOptions.push({
        key: String(workflowOptions.length),
        name: `Workflow ${workflowOptions.length + 1}`,
        confidence: 0,
        evidence: "Insufficient context.",
      });
    }
    renderWorkflowOptions(workflowOptions);
    $("#workflow-picker").classList.remove("hidden");
    $("#analyze-btn").classList.add("hidden");
  } catch (err) {
    showError(err.message || "Unable to load recent tabs.");
  }
}

function confirmWorkflowSelection() {
  const selectedValues = Array.from(document.querySelectorAll('input[name="workflow-option"]:checked')).map((input) => input.value);
  const selectedKeys = new Set(selectedValues);
  const selectedWorkflows = workflowOptions
    .filter((item) => selectedKeys.has(item.key))
    .map((item) => item.name.trim())
    .filter(Boolean);

  if ($("#workflow-option-custom").checked) {
    const customWorkflow = $("#workflow-custom-input").value.trim();
    if (!customWorkflow) {
      showWorkflowPickerError("Type your custom workflow or uncheck it.");
      return;
    }
    selectedWorkflows.push(customWorkflow);
  }

  const uniqueSelectedWorkflows = Array.from(new Set(selectedWorkflows));
  if (uniqueSelectedWorkflows.length === 0) {
    showWorkflowPickerError("Pick at least one workflow before analyzing.");
    return;
  }

  const excludedWorkflows = workflowOptions
    .filter((item) => !selectedKeys.has(item.key))
    .map((item) => item.name.trim())
    .filter(Boolean);

  runAnalysis(uniqueSelectedWorkflows, excludedWorkflows);
}

function cancelWorkflowSelection() {
  hideWorkflowPicker();
}

async function runAnalysis(selectedWorkflows = [], excludedWorkflows = []) {
  hideWorkflowPicker();
  showState("loading");
  try {
    const settings = await getFrontendSettings();
    const result = await sendMessage({
      type: "ANALYZE",
      selectedWorkflows,
      excludedWorkflows,
      useAI: settings.aiEnabled,
      ...settings,
    });
    if (result.error) throw new Error(result.error);
    currentSuggestions = result.suggestions ?? [];
    renderResults(currentSuggestions, {
      workflowHypotheses: result.workflowHypotheses ?? [],
      workflowOptimization: result.workflowOptimization ?? {},
    });
  } catch (err) {
    showError(err.message);
  }
}

function renderWorkflowOptions(options = []) {
  const list = $("#workflow-options");
  list.innerHTML = "";
  options.forEach((item, idx) => {
    const pct = `${Math.round(Math.max(0, Math.min(1, Number(item.confidence) || 0)) * 100)}%`;
    const li = document.createElement("li");
    li.innerHTML = `
      <label class="workflow-option">
        <input type="checkbox" name="workflow-option" value="${escapeHtml(item.key)}" ${idx === 0 ? "checked" : ""} />
        <span>
          <div class="workflow-option-title">${idx + 1}. ${escapeHtml(truncate(item.name, 56))}</div>
          <div class="workflow-option-meta">Confidence: ${escapeHtml(pct)}</div>
          <div class="workflow-option-url">${escapeHtml(item.evidence)}</div>
        </span>
      </label>
    `;
    list.appendChild(li);
  });
  $("#workflow-option-custom").checked = false;
  $("#workflow-custom-input").value = "";
}

function showWorkflowPickerError(msg) {
  const el = $("#workflow-picker-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideWorkflowPickerError() {
  $("#workflow-picker-error").classList.add("hidden");
}

function hideWorkflowPicker() {
  $("#workflow-picker").classList.add("hidden");
  $("#analyze-btn").classList.remove("hidden");
  hideWorkflowPickerError();
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
  const overThreshold = tabCount >= ANALYZE_TAB_THRESHOLD;
  analyzeBtn.disabled = !overThreshold;

  if (overThreshold) {
    gateMsg.textContent = `You have ${tabCount} tabs open. Ready to analyze and clean up?`;
    return;
  }

  const needed = ANALYZE_TAB_THRESHOLD - tabCount;
  gateMsg.textContent = `Open ${needed} more tab${needed === 1 ? "" : "s"} to unlock analysis (starts at 5+ tabs).`;
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

function renderResults(suggestions, workflowAnalysis = {}) {
  renderWorkflowInsights(workflowAnalysis.workflowHypotheses, workflowAnalysis.workflowOptimization);

  if (suggestions.length === 0) {
    $("#results-header").textContent = "All tabs look relevant to your current focus.";
    $("#suggestions-list").innerHTML = "";
    $("#archive-btn").disabled = true;
    $("#delete-close-btn").disabled = true;
    $("#close-count").textContent = "0";
    $("#delete-close-count").textContent = "0";
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

function renderWorkflowInsights(hypotheses = [], workflowOptimization = {}) {
  const wrapper = $("#workflow-insights");
  const current = $("#workflow-current");
  const list = $("#workflow-hypotheses");
  const optimization = $("#workflow-optimization");

  const normalizedHypotheses = hypotheses.slice(0, 3);
  if (!workflowOptimization?.currentWorkflow && normalizedHypotheses.length === 0) {
    wrapper.classList.add("hidden");
    current.textContent = "";
    list.innerHTML = "";
    optimization.textContent = "";
    return;
  }

  wrapper.classList.remove("hidden");
  const currentWorkflow = workflowOptimization?.currentWorkflow || "Likely in a mixed context workflow";
  current.textContent = `Kept workflows: ${currentWorkflow}`;

  list.innerHTML = "";
  normalizedHypotheses.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "workflow-hypothesis";
    const name = item?.name || `Hypothesis ${idx + 1}`;
    const confidence = Number(item?.confidence);
    const pct = Number.isFinite(confidence) ? `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%` : "0%";
    const evidence = item?.evidence || "Insufficient evidence from current history.";
    li.innerHTML = `<strong>${escapeHtml(name)}</strong> (${pct}) - ${escapeHtml(evidence)}`;
    list.appendChild(li);
  });

  optimization.textContent =
    workflowOptimization?.recommendation || "Optimization: Keep tabs tightly aligned with the top workflow hypothesis.";
}

function updateCloseCount() {
  const checked = document.querySelectorAll("#suggestions-list input[type=checkbox]:checked").length;
  $("#close-count").textContent = checked;
  $("#delete-close-count").textContent = checked;
  $("#archive-btn").disabled = checked === 0;
  $("#delete-close-btn").disabled = checked === 0;
}

$("#archive-btn").addEventListener("click", async () => {
  await closeSelectedTabs({ archive: true });
});

$("#delete-close-btn").addEventListener("click", async () => {
  await closeSelectedTabs({ archive: false });
});

async function closeSelectedTabs({ archive }) {
  const checked = [...document.querySelectorAll("#suggestions-list input[type=checkbox]:checked")];
  const indicesToClose = checked.map((cb) => parseInt(cb.id.replace("chk-", ""), 10));
  const tabsToClose = indicesToClose.map((i) => currentSuggestions[i]);
  const tabIds = tabsToClose.map((t) => t.tabId).filter(Boolean);

  if (tabIds.length === 0) return;

  $("#archive-btn").disabled = true;
  $("#delete-close-btn").disabled = true;
  try {
    const result = await sendMessage({
      type: archive ? "ARCHIVE_TABS" : "CLOSE_TABS",
      tabIds,
      tabs: tabsToClose,
    });
    if (result.error) throw new Error(result.error);
    await initIdle();
  } catch (err) {
    showError(err.message);
  }
}

$("#cancel-btn").addEventListener("click", initIdle);

// ─── Archive panel ────────────────────────────────────────────────────────────

async function loadArchive() {
  const result = await sendMessage({ type: "GET_ARCHIVE" });
  const archive = result.archive ?? [];
  const list = $("#archive-list");
  const empty = $("#archive-empty");
  const toolbar = $("#archive-toolbar");

  list.innerHTML = "";

  if (archive.length === 0) {
    toolbar.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  toolbar.classList.remove("hidden");
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
    btn.dataset.archivedAt = String(item.archivedAt ?? "");
    btn.textContent = "↩ Restore";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.dataset.url = item.url;
    deleteBtn.dataset.archivedAt = String(item.archivedAt ?? "");
    deleteBtn.textContent = "Delete";

    const actions = document.createElement("div");
    actions.className = "archive-actions";
    actions.appendChild(btn);
    actions.appendChild(deleteBtn);

    li.appendChild(img);
    li.appendChild(info);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

$("#archive-delete-all-btn").addEventListener("click", async () => {
  const btn = $("#archive-delete-all-btn");
  btn.disabled = true;
  try {
    const result = await sendMessage({ type: "CLEAR_ARCHIVE" });
    if (result.error) throw new Error(result.error);
    await loadArchive();
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
  }
});

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
    chrome.storage.local.get(["apiKey", "model", "userContext", "aiEnabled"], (data) => {
      if (chrome.runtime.lastError) {
        resolve({});
        return;
      }
      resolve({
        apiKey: data.apiKey ?? "",
        model: data.model ?? "gpt-5-mini",
        userContext: data.userContext ?? "",
        aiEnabled: data.aiEnabled !== false,
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
  const restoreBtn = e.target.closest(".restore-btn");
  if (restoreBtn) {
    restoreBtn.disabled = true;
    const url = restoreBtn.dataset.url;
    const archivedAt = Number(restoreBtn.dataset.archivedAt);
    await sendMessage({ type: "RESTORE_TAB", url, archivedAt: Number.isFinite(archivedAt) ? archivedAt : null });
    await loadArchive();
    return;
  }

  const deleteBtn = e.target.closest(".delete-btn");
  if (!deleteBtn) return;
  deleteBtn.disabled = true;
  const url = deleteBtn.dataset.url;
  const archivedAt = Number(deleteBtn.dataset.archivedAt);
  await sendMessage({ type: "DELETE_ARCHIVE_ENTRY", url, archivedAt: Number.isFinite(archivedAt) ? archivedAt : null });
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
