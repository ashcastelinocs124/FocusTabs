const { buildPrompt, buildLocalAnalysis, tokenizeText, overlapScore } = require('../utils/prompt');

const activeTab = { title: 'GitHub PR #42', url: 'https://github.com/org/repo/pull/42', summary: 'Fix auth bug' };
const otherTabs = [
  { index: 0, title: 'Amazon - Shoes', url: 'https://amazon.com/shoes', summary: 'Buy shoes' },
  { index: 1, title: 'MDN - Array', url: 'https://developer.mozilla.org/array', summary: 'JavaScript docs' },
];
const decisions = [
  { action: 'keep', tabTitle: 'MDN docs', activeTitle: 'GitHub PR', tabUrl: 'mdn.com' },
];
const recentHistory = [
  { when: '2m ago', title: 'Jira Sprint Board', url: 'https://jira.example.com/sprint' },
];

describe('buildPrompt', () => {
  test('includes active tab title and url in userMessage', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions, '', recentHistory);
    expect(userMessage).toContain('GitHub PR #42');
    expect(userMessage).toContain('https://github.com/org/repo/pull/42');
  });

  test('includes all other tab titles in userMessage', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions, '', recentHistory);
    expect(userMessage).toContain('Amazon - Shoes');
    expect(userMessage).toContain('MDN - Array');
  });

  test('includes past decisions in userMessage', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions, '', recentHistory);
    expect(userMessage).toContain('kept');
    expect(userMessage).toContain('MDN docs');
  });

  test('systemMessage instructs JSON-only response', () => {
    const { systemMessage } = buildPrompt(activeTab, otherTabs, decisions, '', recentHistory);
    expect(systemMessage).toContain('JSON');
    expect(systemMessage.toLowerCase()).toContain('focus');
  });

  test('returns object with both systemMessage and userMessage', () => {
    const result = buildPrompt(activeTab, otherTabs, decisions, '', recentHistory);
    expect(result).toHaveProperty('systemMessage');
    expect(result).toHaveProperty('userMessage');
    expect(typeof result.systemMessage).toBe('string');
    expect(typeof result.userMessage).toBe('string');
  });

  test('handles empty decisions gracefully', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, [], '', recentHistory);
    expect(userMessage).toContain('none yet');
  });

  test('handles empty otherTabs gracefully', () => {
    const { userMessage } = buildPrompt(activeTab, [], decisions, '', recentHistory);
    expect(userMessage).toContain('(none)');
    expect(userMessage).toContain('GitHub PR #42'); // active tab still present
  });

  test('includes tab index brackets in the tab list', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions, '', recentHistory);
    expect(userMessage).toContain('[0]');
    expect(userMessage).toContain('[1]');
  });

  test('sanitizes null/undefined tab fields to empty string', () => {
    const { userMessage } = buildPrompt(
      { title: null, url: undefined, summary: null },
      [{ index: 0, title: undefined, url: null, summary: undefined }],
      [],
      '',
      recentHistory
    );
    // Should not contain the string "null" or "undefined"
    expect(userMessage).not.toContain('"null"');
    expect(userMessage).not.toContain('"undefined"');
  });

  test('URL is quoted consistently in the prompt', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions, '', recentHistory);
    // Active tab URL should be quoted
    expect(userMessage).toContain('"https://github.com/org/repo/pull/42"');
    // Other tab URLs should be quoted
    expect(userMessage).toContain('"https://amazon.com/shoes"');
  });

  test('includes recent tab history context with timestamps', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions, '', recentHistory);
    expect(userMessage).toContain('Recent tab history');
    expect(userMessage).toContain('[2m ago]');
    expect(userMessage).toContain('Jira Sprint Board');
  });

  test('includes selected and unselected workflow context', () => {
    const { userMessage } = buildPrompt(
      activeTab,
      otherTabs,
      decisions,
      '',
      recentHistory,
      ['Sprint planning', 'PR review'],
      ['Shopping']
    );
    expect(userMessage).toContain('User-selected workflows to keep');
    expect(userMessage).toContain('Sprint planning');
    expect(userMessage).toContain('PR review');
    expect(userMessage).toContain('Inferred workflows the user did not select');
    expect(userMessage).toContain('Shopping');
  });
});

// ─── Local analysis (no AI) tests ────────────────────────────────────────────

describe('tokenizeText', () => {
  test('splits text into lowercase tokens and removes stopwords', () => {
    const tokens = tokenizeText('The React Dashboard with Charts');
    expect(tokens).toContain('react');
    expect(tokens).toContain('dashboard');
    expect(tokens).toContain('charts');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('with');
  });

  test('filters out short tokens (<=2 chars)', () => {
    const tokens = tokenizeText('Go is a great language');
    expect(tokens).not.toContain('go');
    expect(tokens).not.toContain('is');
    expect(tokens).toContain('great');
    expect(tokens).toContain('language');
  });

  test('filters out common URL tokens', () => {
    const tokens = tokenizeText('https://www.example.com/page.html');
    expect(tokens).not.toContain('https');
    expect(tokens).not.toContain('www');
    expect(tokens).not.toContain('com');
    expect(tokens).not.toContain('html');
    expect(tokens).toContain('example');
    expect(tokens).toContain('page');
  });

  test('returns empty array for empty/null input', () => {
    expect(tokenizeText('')).toEqual([]);
    expect(tokenizeText(null)).toEqual([]);
    expect(tokenizeText(undefined)).toEqual([]);
  });
});

describe('overlapScore', () => {
  test('returns 1.0 when all source tokens exist in target', () => {
    const score = overlapScore(['react', 'dashboard'], new Set(['react', 'dashboard', 'extra']));
    expect(score).toBe(1.0);
  });

  test('returns 0.5 when half the source tokens match', () => {
    const score = overlapScore(['react', 'pizza'], new Set(['react', 'dashboard']));
    expect(score).toBe(0.5);
  });

  test('returns 0 when no tokens match', () => {
    const score = overlapScore(['pizza', 'delivery'], new Set(['react', 'dashboard']));
    expect(score).toBe(0);
  });

  test('returns 0 for empty inputs', () => {
    expect(overlapScore([], new Set(['react']))).toBe(0);
    expect(overlapScore(['react'], new Set())).toBe(0);
  });
});

describe('buildLocalAnalysis', () => {
  const focus = { title: 'React Dashboard Project', url: 'https://github.com/myapp', summary: 'Building a dashboard' };

  test('marks tab with matching keywords as relevant', () => {
    const tabs = [
      { index: 0, title: 'React Docs', url: 'https://react.dev', summary: 'React documentation' },
    ];
    const result = buildLocalAnalysis(focus, tabs, 'React dashboard', [], []);
    expect(result.tabDecisions[0].relevant).toBe(true);
    expect(result.tabDecisions[0].reason).toContain('Score:');
  });

  test('marks tab with no keyword overlap as not relevant', () => {
    const tabs = [
      { index: 0, title: 'Best Pizza Near Me', url: 'https://google.com/search?q=pizza', summary: 'Pizza restaurants' },
    ];
    const result = buildLocalAnalysis(focus, tabs, 'React dashboard', [], []);
    expect(result.tabDecisions[0].relevant).toBe(false);
  });

  test('flags tab matching an excluded workflow', () => {
    const tabs = [
      { index: 0, title: 'Best Pizza Near Me', url: 'https://google.com/search?q=pizza', summary: 'Pizza delivery' },
    ];
    const result = buildLocalAnalysis(focus, tabs, 'React dashboard', [], ['Best Pizza Near Me']);
    expect(result.tabDecisions[0].relevant).toBe(false);
    expect(result.tabDecisions[0].reason).toContain('excluded workflow');
  });

  test('does not penalize tabs when no excluded workflows are provided', () => {
    const tabs = [
      { index: 0, title: 'React Docs', url: 'https://react.dev', summary: 'Docs' },
    ];
    const result = buildLocalAnalysis(focus, tabs, 'React', [], []);
    expect(result.tabDecisions[0].relevant).toBe(true);
  });

  test('returns correct workflowHypotheses structure', () => {
    const tabs = [
      { index: 0, title: 'Test', url: 'https://test.com', summary: '' },
    ];
    const result = buildLocalAnalysis(focus, tabs, '', [], []);
    expect(result.workflowHypotheses).toHaveLength(1);
    expect(result.workflowHypotheses[0]).toHaveProperty('name');
    expect(result.workflowHypotheses[0]).toHaveProperty('confidence');
    expect(result.workflowHypotheses[0]).toHaveProperty('evidence');
  });

  test('includes excluded workflows in hypotheses', () => {
    const tabs = [
      { index: 0, title: 'Test', url: 'https://test.com', summary: '' },
    ];
    const result = buildLocalAnalysis(focus, tabs, '', ['React dev'], ['Shopping', 'Gaming']);
    expect(result.workflowHypotheses.length).toBeGreaterThanOrEqual(2);
    expect(result.workflowHypotheses.some((h) => h.name === 'Shopping')).toBe(true);
  });

  test('workflowOptimization reflects keep/close counts', () => {
    const tabs = [
      { index: 0, title: 'React Hooks Guide', url: 'https://react.dev/hooks', summary: 'React hooks' },
      { index: 1, title: 'Pizza Delivery', url: 'https://pizza.com', summary: 'Order pizza' },
    ];
    const result = buildLocalAnalysis(focus, tabs, 'React dashboard', [], []);
    expect(result.workflowOptimization.recommendation).toMatch(/\d+ tab/);
  });

  test('uses all selected workflows in currentWorkflow', () => {
    const tabs = [
      { index: 0, title: 'React Hooks Guide', url: 'https://react.dev/hooks', summary: 'React hooks' },
    ];
    const result = buildLocalAnalysis(focus, tabs, '', ['Sprint planning', 'PR review'], []);
    expect(result.workflowOptimization.currentWorkflow).toBe('Sprint planning + PR review');
  });

  test('handles empty summaries array', () => {
    const result = buildLocalAnalysis(focus, [], 'React', [], []);
    expect(result.tabDecisions).toEqual([]);
    expect(result.workflowOptimization.recommendation).toContain('All tabs');
  });

  test('uses userContext for relevance when provided', () => {
    const tabs = [
      { index: 0, title: 'Chart.js Examples', url: 'https://chartjs.org', summary: 'Bar charts examples' },
    ];
    const withoutCtx = buildLocalAnalysis(focus, tabs, '', [], []);
    const withCtx = buildLocalAnalysis(focus, tabs, 'Building charts for React dashboard', [], []);
    const scoreWithout = parseInt(withoutCtx.tabDecisions[0].reason.match(/Score: (\d+)%/)[1]);
    const scoreWith = parseInt(withCtx.tabDecisions[0].reason.match(/Score: (\d+)%/)[1]);
    expect(scoreWith).toBeGreaterThanOrEqual(scoreWithout);
  });
});
