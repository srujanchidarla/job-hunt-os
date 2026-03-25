// ── JobHuntOS background service worker ──────────────────────────────────────

const JHOS_STORAGE_KEY = 'jhos_pending_autofill';

const ATS_PATTERNS = [
  /greenhouse\.io/,
  /lever\.co/,
  /linkedin\.com/,
  /workday\.com/,
  /myworkdayjobs\.com/,
  /icims\.com/,
  /smartrecruiters\.com/,
  /jobvite\.com/,
  /ashbyhq\.com/,
  /indeed\.com/,
  /ziprecruiter\.com/,
  /amazon\.jobs/,
  /amazoncareers/,
  /bamboohr\.com/,
  /taleo\.net/,
  /successfactors/,
  /careers\./,
];

// Also treat any URL with /apply or /application as an ATS page
function isAtsUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return ATS_PATTERNS.some(re => re.test(u.hostname + u.pathname)) ||
           /\/apply|\/application|\/applicant/i.test(u.pathname);
  }
  catch { return false; }
}

// ── Script injection helpers ─────────────────────────────────────────────────

async function injectAutofillScripts(tabId) {
  try {
    // Check the tab is still accessible
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

    // executeScript is idempotent — safe to call if already injected
    await chrome.scripting.executeScript({
      target: { tabId },
      files:  ['autofill.js', 'content.js'],
    });
  } catch (err) {
    // Tab may have closed or navigated away — not a problem
    console.warn('[JobHuntOS BG] Could not inject scripts into tab', tabId, err.message);
  }
}

// ── P1 FIX: Inject content scripts when a new ATS tab becomes ready ─────────
// Covers the case where user clicks "Apply" and a fresh tab opens.

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Wait until the page has finished loading
  if (changeInfo.status !== 'complete') return;
  if (!isAtsUrl(tab.url)) return;

  // Inject autofill.js first (defines JobHuntOSAutofill class), then content.js
  injectAutofillScripts(tabId);
});

// ── Extension icon click — inject sidebar ───────────────────────────────────

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url || tab.url.startsWith('chrome://')) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files:  ['autofill.js', 'content.js'],
    });
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
  } catch (err) {
    console.error('[JobHuntOS] Failed to inject content script:', err);
  }
});

// ── LinkedIn profile extraction ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_TEXT') {
    chrome.tabs.query({}, async (tabs) => {
      const linkedInTab = tabs.find(t => t.url?.includes('linkedin.com/in/'));
      const fallback    = tabs
        .filter(t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'))
        .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
      const tab = linkedInTab || fallback;

      if (!tab?.id) { sendResponse({ error: 'No active tab' }); return; }
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func:   () => ({ url: location.href, rawText: document.body.innerText }),
        });
        sendResponse(results[0]?.result || {});
      } catch (err) {
        sendResponse({ error: err.message });
      }
    });
    return true; // keep channel open
  }

  // ── P2 FIX: Sidebar writes pending autofill to storage; we also trigger
  // injection into whichever tab is the most-recently-focused ATS tab. ──────

  if (msg.type === 'QUEUE_AUTOFILL') {
    // Payload: { autofillValues, profileData, analysisData, triggeredAt }
    chrome.storage.local.set({ [JHOS_STORAGE_KEY]: msg.payload }, () => {
      // Try to inject into whichever ATS tab is currently visible
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, async (tabs) => {
        const tab = tabs[0];
        if (tab && isAtsUrl(tab.url)) {
          await injectAutofillScripts(tab.id);
          // Small delay for scripts to load, then fire the message
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
              type:         'START_AUTOFILL',
              profileData:  msg.payload.profileData,
              analysisData: msg.payload.analysisData,
            }).catch(() => { /* tab context may have been replaced — storage will handle it */ });
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
      body: JSON.stringify({
        notionPageId: msg.notionPageId,
        status: msg.status || 'Applied',
        appliedDate: new Date().toISOString().split('T')[0],
      }),
    }).catch(err => console.warn('[JobHuntOS BG] Notion status update failed:', err.message));
    sendResponse({ queued: true });
    return true;
  }
});
