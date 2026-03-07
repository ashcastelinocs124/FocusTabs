// prompt.js — builds the LLM prompt for tab relevance analysis

const SYSTEM_MESSAGE = `You are a focus assistant. Your job is to evaluate whether browser tabs are relevant to what the user is currently working on.

Return ONLY a JSON array. No markdown, no explanation, no other text.

Each element must have:
{ "index": <number>, "relevant": <boolean>, "reason": "<one sentence>" }`;

function buildPrompt(activeTab, otherTabs, decisions) {
  const tabList = otherTabs
    .map(
      (t) =>
        `  [${t.index}] Title: "${t.title}"
  URL: ${t.url}
  Summary: "${t.summary}"`
    )
    .join('\n\n');

  const decisionContext = decisions.length
    ? decisions
        .map(
          (d) =>
            `  - User ${d.action === 'keep' ? 'kept' : 'closed'} "${d.tabTitle}" while focused on "${d.activeTitle}"`
        )
        .join('\n')
    : '  (none yet)';

  const userMessage = `Focus tab (what the user is currently working on):
  Title: "${activeTab.title}"
  URL: ${activeTab.url}
  Summary: "${activeTab.summary}"

Other open tabs:
${tabList || '  (none)'}

Past decisions (learning context, most recent first):
${decisionContext}

For each tab above, respond with a JSON array:
[{ "index": 0, "relevant": false, "reason": "..." }, ...]`;

  return { systemMessage: SYSTEM_MESSAGE, userMessage };
}

module.exports = { buildPrompt };
