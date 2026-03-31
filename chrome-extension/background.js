// background.js - Complete rewrite

const BACKEND_URL = 'http://localhost:3000'

const URL_PATTERNS = {
  listing: [
    /linkedin\.com\/jobs\/(view|collections|search|recommended)/,
    /linkedin\.com\/jobs\/.*currentJobId/,
    /indeed\.com\/(viewjob|rc\/clk|pagead)/,
    /glassdoor\.com\/job-listing/,
    /glassdoor\.com\/Job\//,
    /wellfound\.com\/jobs\//,
    /builtin\.com\/job\//,
    /levels\.fyi\/jobs\//,
    /ziprecruiter\.com\/jobs\//,
  ],
  form: [
    /greenhouse\.io\/.*\/jobs\/\d+\/apply/,
    /greenhouse\.io\/.*\/jobs\//,
    /lever\.co\/.*\/apply/,
    /workday\.com.*\/job\//,
    /myworkdayjobs\.com/,
    /icims\.com.*\/jobs\//,
    /smartrecruiters\.com.*\/apply/,
    /jobvite\.com.*\/apply/,
    /ashbyhq\.com/,
    /bamboohr\.com.*\/jobs\//,
    /account\.amazon\.jobs.*\/apply/,
    /amazon\.jobs.*\/apply/,
    /careers\.walmart\.com.*\/apply/,
    /linkedin\.com\/jobs\/apply/,
    /indeed\.com.*\/apply/,
    /metacareers\.com.*\/apply/,
    /careers\.google\.com.*\/apply/,
    /\/apply\/?(\?|$)/,
    /\/application\/?(\?|$)/,
  ],
  linkedin_profile: [
    /linkedin\.com\/in\/[^/]+/,
  ]
}

function detectMode(url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return 'unknown'
  }
  for (const pattern of URL_PATTERNS.listing) {
    if (pattern.test(url)) return 'listing'
  }
  for (const pattern of URL_PATTERNS.form) {
    if (pattern.test(url)) return 'form'
  }
  for (const pattern of URL_PATTERNS.linkedin_profile) {
    if (pattern.test(url)) return 'linkedin_profile'
  }
  return 'unknown'
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  if (!tab.url) return

  const mode = detectMode(tab.url)

  const { appState = {} } = await chrome.storage.local.get('appState')
  await chrome.storage.local.set({
    appState: {
      ...appState,
      currentMode: mode,
      currentUrl: tab.url,
      currentTabId: tabId
    }
  })

  if (mode === 'form') {
    const { appState: state } = await chrome.storage.local.get('appState')
    const pending = state?.pendingAutofill

    if (pending && pending.status === 'pending') {
      const age = Date.now() - (pending.timestamp || 0)
      if (age < 30 * 60 * 1000) {
        // Mark as injecting BEFORE the setTimeout fires so re-entrant tab
        // updates (common on SPAs) don't queue a second injection.
        await chrome.storage.local.set({
          appState: {
            ...state,
            pendingAutofill: { ...pending, status: 'injecting' }
          }
        })

        setTimeout(async () => {
          try {
            // Check iframe already present before injecting autofill
            const results = await chrome.scripting.executeScript({
              target: { tabId },
              func: () => !!document.getElementById('jhos-autofill-active')
            })
            if (results[0]?.result) return  // already running, stop

            await chrome.scripting.executeScript({
              target: { tabId },
              files: ['autofill.js']
            })
          } catch (err) {
            console.warn('JobHuntOS: inject failed', err)
          }
        }, 2000)
      }
    }
  }

  // linkedin_profile auto-parse removed — user triggers parse manually via sidebar
})

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

  try {
    // Resolve the URL here in the background context — chrome.runtime.getURL()
    // returns 'chrome-extension://invalid/' when called in page context (content script).
    const sidebarUrl = chrome.runtime.getURL('sidebar.html')

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (url) => {
        // Toggle: if sidebar is already open, close it
        const existing = document.getElementById('jobhuntos-sidebar-frame')
        if (existing) {
          existing.remove()
          document.body.style.marginRight = ''
          document.body.style.transition = ''
          return
        }
        // Guard: never create a second frame if one already exists
        if (document.getElementById('jobhuntos-sidebar-frame')) return
        const frame = document.createElement('iframe')
        frame.id = 'jobhuntos-sidebar-frame'
        frame.src = url  // URL passed from background — never call chrome.runtime.getURL here
        frame.style.cssText = 'position:fixed!important;top:0!important;right:0!important;width:380px!important;height:100vh!important;border:none!important;z-index:2147483647!important;box-shadow:-4px 0 24px rgba(0,0,0,0.2)!important;'
        document.body.appendChild(frame)
        document.body.style.transition = 'margin-right 0.25s ease'
        document.body.style.marginRight = '380px'
      },
      args: [sidebarUrl]
    })
  } catch (err) {
    console.warn('JobHuntOS: Could not inject sidebar', err)
  }
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getBackendUrl') {
    sendResponse({ url: BACKEND_URL })
    return  // sync — no need to keep channel open
  }

  if (msg.action === 'openUrl') {
    chrome.tabs.create({ url: msg.url })
    sendResponse({ ok: true })  // always call sendResponse to close the channel
    return
  }

  // Inject autofill.js into the sender tab via chrome.scripting (MV3-safe).
  // Called by content.js after it has written jhos_pending_autofill to storage.
  if (msg.action === 'injectAutofill') {
    const tabId = sender.tab?.id
    if (!tabId) { sendResponse({ ok: false, error: 'no tabId' }); return }
    chrome.scripting.executeScript({ target: { tabId }, files: ['autofill.js'] })
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }))
    return true  // async — keep channel open
  }

  // Save profile from content script (survives context invalidation)
  if (msg.action === 'saveProfile') {
    chrome.storage.local.set({ userProfile: msg.profile }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message })
      } else {
        sendResponse({ ok: true })
      }
    })
    return true  // async — keep channel open
  }

  // Unknown message — do NOT return true; let the channel close immediately
})
