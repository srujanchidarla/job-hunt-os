// Used by setup.js to grab the active tab's text for LinkedIn profile extraction.
// Must search ALL windows because the sidebar itself is the "active" tab in its
// own window — we need the LinkedIn tab the user has open in a normal window.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'GET_PAGE_TEXT') return;

  chrome.tabs.query({}, async (tabs) => {
    // Prefer a LinkedIn tab; fall back to the last focused non-extension tab
    const linkedInTab = tabs.find(t => t.url?.includes('linkedin.com/in/'));
    const fallback    = tabs.filter(t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'))
                            .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
    const tab = linkedInTab || fallback;

    if (!tab?.id) { sendResponse({ error: 'No active tab' }); return; }
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({ url: location.href, rawText: document.body.innerText }),
      });
      sendResponse(results[0]?.result || {});
    } catch (err) {
      sendResponse({ error: err.message });
    }
  });
  return true; // keep channel open for async response
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || tab.url.startsWith('chrome://')) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
  } catch (err) {
    console.error('[JobHuntOS] Failed to inject content script:', err);
  }
});
