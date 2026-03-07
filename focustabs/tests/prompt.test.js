const { buildPrompt } = require('../utils/prompt');

const activeTab = { title: 'GitHub PR #42', url: 'https://github.com/org/repo/pull/42', summary: 'Fix auth bug' };
const otherTabs = [
  { index: 0, title: 'Amazon - Shoes', url: 'https://amazon.com/shoes', summary: 'Buy shoes' },
  { index: 1, title: 'MDN - Array', url: 'https://developer.mozilla.org/array', summary: 'JavaScript docs' },
];
const decisions = [
  { action: 'keep', tabTitle: 'MDN docs', activeTitle: 'GitHub PR', tabUrl: 'mdn.com' },
];

describe('buildPrompt', () => {
  test('includes active tab title and url in userMessage', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions);
    expect(userMessage).toContain('GitHub PR #42');
    expect(userMessage).toContain('https://github.com/org/repo/pull/42');
  });

  test('includes all other tab titles in userMessage', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions);
    expect(userMessage).toContain('Amazon - Shoes');
    expect(userMessage).toContain('MDN - Array');
  });

  test('includes past decisions in userMessage', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions);
    expect(userMessage).toContain('kept');
    expect(userMessage).toContain('MDN docs');
  });

  test('systemMessage instructs JSON-only response', () => {
    const { systemMessage } = buildPrompt(activeTab, otherTabs, decisions);
    expect(systemMessage).toContain('JSON');
    expect(systemMessage.toLowerCase()).toContain('focus');
  });

  test('returns object with both systemMessage and userMessage', () => {
    const result = buildPrompt(activeTab, otherTabs, decisions);
    expect(result).toHaveProperty('systemMessage');
    expect(result).toHaveProperty('userMessage');
    expect(typeof result.systemMessage).toBe('string');
    expect(typeof result.userMessage).toBe('string');
  });

  test('handles empty decisions gracefully', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, []);
    expect(userMessage).toContain('none yet');
  });

  test('handles empty otherTabs gracefully', () => {
    const { userMessage } = buildPrompt(activeTab, [], decisions);
    expect(userMessage).toContain('(none)');
    expect(userMessage).toContain('GitHub PR #42'); // active tab still present
  });

  test('includes tab index brackets in the tab list', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions);
    expect(userMessage).toContain('[0]');
    expect(userMessage).toContain('[1]');
  });

  test('sanitizes null/undefined tab fields to empty string', () => {
    const { userMessage } = buildPrompt(
      { title: null, url: undefined, summary: null },
      [{ index: 0, title: undefined, url: null, summary: undefined }],
      []
    );
    // Should not contain the string "null" or "undefined"
    expect(userMessage).not.toContain('"null"');
    expect(userMessage).not.toContain('"undefined"');
  });

  test('URL is quoted consistently in the prompt', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions);
    // Active tab URL should be quoted
    expect(userMessage).toContain('"https://github.com/org/repo/pull/42"');
    // Other tab URLs should be quoted
    expect(userMessage).toContain('"https://amazon.com/shoes"');
  });
});
