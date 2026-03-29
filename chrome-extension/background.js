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
    /linkedin\.com\/in\/[^/]+\/?$/,
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
        setTimeout(async () => {
          try {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ['autofill.js']
            })
            await chrome.tabs.sendMessage(tabId, {
              action: 'showAutofillPopup',
              fromStorage: true
            })
          } catch (err) {
            console.warn('JobHuntOS: inject failed', err)
          }
        }, 2000)
      }
    }
  }

  if (mode === 'linkedin_profile') {
    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'parseLinkedInProfile'
        })
      } catch (err) {
        // Content script may not be ready yet
      }
    }, 2000)
  }
})

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: toggleSidebar
    })
  } catch (err) {
    console.warn('JobHuntOS: Could not inject sidebar', err)
  }
})

function toggleSidebar() {
  const existing = document.getElementById('jobhuntos-sidebar-frame')
  if (existing) {
    existing.remove()
    document.body.style.marginRight = ''
    document.body.style.transition = ''
    return
  }

  const frame = document.createElement('iframe')
  frame.id = 'jobhuntos-sidebar-frame'
  frame.src = chrome.runtime.getURL('sidebar.html')
  frame.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: 380px !important;
    height: 100vh !important;
    border: none !important;
    z-index: 2147483647 !important;
    box-shadow: -4px 0 24px rgba(0,0,0,0.2) !important;
  `
  document.body.appendChild(frame)
  document.body.style.transition = 'margin-right 0.25s ease'
  document.body.style.marginRight = '380px'
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getBackendUrl') {
    sendResponse({ url: BACKEND_URL })
  }
  if (msg.action === 'openUrl') {
    chrome.tabs.create({ url: msg.url })
  }
  return true
})
