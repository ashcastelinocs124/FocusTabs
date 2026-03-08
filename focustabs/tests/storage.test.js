// We test storage.js by mocking chrome.storage.local via jest-chrome.
const { getSettings, saveSettings, addDecision, getDecisions, addToArchive, getArchive, removeFromArchive } = require('../utils/storage');

describe('storage', () => {
  beforeEach(() => {
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({}));
    chrome.storage.local.set.mockImplementation((obj, cb) => cb && cb());
  });

  test('getSettings returns defaults when storage is empty', async () => {
    const settings = await getSettings();
    expect(settings.model).toBe('gpt-5-mini');
    expect(settings.apiKey).toBe('');
  });

  test('saveSettings writes to storage', async () => {
    chrome.storage.local.set.mockImplementation((obj, cb) => { cb && cb(); });
    await saveSettings({ apiKey: 'sk-ant-test', model: 'claude-sonnet-4' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'sk-ant-test', model: 'claude-sonnet-4' }),
      expect.any(Function)
    );
  });

  test('saveSettings normalizes model for Anthropic key when mismatched', async () => {
    chrome.storage.local.set.mockImplementation((obj, cb) => { cb && cb(); });
    await saveSettings({ apiKey: 'sk-ant-test', model: 'gpt-5' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'sk-ant-test', model: 'claude-sonnet-4' }),
      expect.any(Function)
    );
  });

  test('addDecision appends to existing decisions', async () => {
    const existing = [{ tabUrl: 'a.com', action: 'close', timestamp: 1 }];
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({ decisions: existing }));

    let saved;
    chrome.storage.local.set.mockImplementation((obj, cb) => { saved = obj; cb && cb(); });

    await addDecision({ tabUrl: 'b.com', action: 'keep', timestamp: 2, activeUrl: 'c.com', activeTitle: 'C', tabTitle: 'B', userOverrode: false });

    expect(saved.decisions).toHaveLength(2);
    expect(saved.decisions[1].tabUrl).toBe('b.com');
  });

  test('getDecisions returns last 20', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ tabUrl: `${i}.com`, timestamp: i }));
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({ decisions: many }));
    const decisions = await getDecisions();
    expect(decisions).toHaveLength(20);
    expect(decisions[0].timestamp).toBe(29); // most recent first
  });

  test('addToArchive prepends entry', async () => {
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({ archive: [] }));
    let saved;
    chrome.storage.local.set.mockImplementation((obj, cb) => { saved = obj; cb && cb(); });

    await addToArchive({ url: 'x.com', title: 'X', favicon: '', archivedAt: 99 });
    expect(saved.archive[0].url).toBe('x.com');
  });

  test('removeFromArchive filters by url', async () => {
    chrome.storage.local.get.mockImplementation((keys, cb) =>
      cb({ archive: [{ url: 'x.com' }, { url: 'y.com' }] })
    );
    let saved;
    chrome.storage.local.set.mockImplementation((obj, cb) => { saved = obj; cb && cb(); });

    await removeFromArchive('x.com');
    expect(saved.archive).toHaveLength(1);
    expect(saved.archive[0].url).toBe('y.com');
  });

  test('getSettings returns stored values when present', async () => {
    chrome.storage.local.get.mockImplementation((keys, cb) =>
      cb({ apiKey: 'sk-ant-live', model: 'claude-sonnet-4' })
    );
    const settings = await getSettings();
    expect(settings.apiKey).toBe('sk-ant-live');
    expect(settings.model).toBe('claude-sonnet-4');
  });

  test('normalizes model when API key provider and model provider do not match', async () => {
    chrome.storage.local.get.mockImplementation((keys, cb) =>
      cb({ apiKey: 'sk-ant-live', model: 'gpt-5' })
    );
    const settings = await getSettings();
    expect(settings.apiKey).toBe('sk-ant-live');
    expect(settings.model).toBe('claude-sonnet-4');
  });

  test('normalizes legacy Claude 3.5 selection to Claude Sonnet 4', async () => {
    chrome.storage.local.get.mockImplementation((keys, cb) =>
      cb({ apiKey: 'sk-ant-live', model: 'claude-3-5-sonnet' })
    );
    const settings = await getSettings();
    expect(settings.apiKey).toBe('sk-ant-live');
    expect(settings.model).toBe('claude-sonnet-4');
  });

  test('getArchive returns empty array when storage is empty', async () => {
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({}));
    const archive = await getArchive();
    expect(archive).toEqual([]);
  });

  test('addDecision caps stored decisions at 100', async () => {
    const existing = Array.from({ length: 100 }, (_, i) => ({ tabUrl: `${i}.com`, timestamp: i }));
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({ decisions: existing }));
    let saved;
    chrome.storage.local.set.mockImplementation((obj, cb) => { saved = obj; cb && cb(); });

    await addDecision({ tabUrl: 'new.com', timestamp: 100, action: 'close', activeUrl: '', activeTitle: '', tabTitle: '', userOverrode: false });

    expect(saved.decisions).toHaveLength(100); // still 100, oldest dropped
    expect(saved.decisions[99].tabUrl).toBe('new.com'); // new one is last
  });
});
