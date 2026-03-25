// JobHuntOS background service worker

const JHOS_STORAGE_KEY = 'jhos_pending_autofill';

const ATS_PATTERNS = [
  /greenhouse\.io/, /lever\.co/, /linkedin\.com/, /workday\.com/,
  /myworkdayjobs\.com/, /icims\.com/, /smartrecruiters\.com/, /jobvite\.com/,
  /ashbyhq\.com/, /indeed\.com/, /ziprecruiter\.com/, /amazon\.jobs/,
  /amazoncareers/, /bamboohr\.com/, /taleo\.net/, /successfactors/, /careers\./,
];

function isAtsUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return ATS_PATTERNS.some(re => re.test(u.hostname + u.pathname)) ||
           /\/apply|\/application|\/applicant/i.test(u.pathname);
  } catch { return false; }
}

async function injectScripts(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;
    await chrome.scripting.executeScript({ target: { tabId }, files: ['autofill.js', 'content.js'] });
  } catch (err) {
    console.warn('[JobHuntOS BG] inject failed', tabId, err.message);
  }
}

// Auto-inject on ATS pages (for pending autofill cross-tab flow)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!isAtsUrl(tab.url)) return;
  injectScripts(tabId);
});

// Extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || tab.url.startsWith('chrome://')) return;
  try {
    await injectScripts(tab.id);
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
  } catch (err) {
    console.error('[JobHuntOS] toggle failed:', err);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_TEXT') {
    chrome.tabs.query({}, async (tabs) => {
      const linkedInTab = tabs.find(t => t.url?.includes('linkedin.com/in/'));
      const fallback = tabs.filter(t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'))
                           .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
      const tab = linkedInTab || fallback;
      if (!tab?.id) { sendResponse({ error: 'No active tab' }); return; }
      try {
        const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => ({ url: location.href, rawText: document.body.innerText }) });
        sendResponse(results[0]?.result || {});
      } catch (err) { sendResponse({ error: err.message }); }
    });
    return true;
  }

  if (msg.type === 'QUEUE_AUTOFILL') {
    chrome.storage.local.set({ [JHOS_STORAGE_KEY]: msg.payload }, () => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (tab && isAtsUrl(tab.url)) {
          await injectScripts(tab.id);
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { type: 'START_AUTOFILL', profileData: msg.payload.profileData, analysisData: msg.payload.analysisData }).catch(() => {});
          }, 300);
        }
        sendResponse({ queued: true });
      });
    });
    return true;
  }

  if (msg.type === 'UPDATE_NOTION_STATUS') {
    fetch('http://localhost:3000/api/update-notion-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notionPageId: msg.notionPageId, status: msg.status || 'Applied', appliedDate: new Date().toISOString().split('T')[0] }),
    }).catch(err => console.warn('[JobHuntOS BG] Notion update failed:', err.message));
    sendResponse({ queued: true });
    return true;
  }
});
