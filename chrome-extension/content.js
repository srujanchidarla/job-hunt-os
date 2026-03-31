// content.js — JobHuntOS

const BACKEND = 'http://localhost:3000'

// ─────────────────────────────────────────────────────────────
// MODE DETECTION  (query-params are stripped before matching)
// ─────────────────────────────────────────────────────────────
function detectMode(url) {
  if (!url) { console.log('[JHOS] mode: unknown url:', url); return 'unknown' }

  let path
  try { path = new URL(url).pathname } catch { console.log('[JHOS] mode: unknown url:', url); return 'unknown' }

  // linkedin_profile — check path starts with /in/ and is NOT a jobs or company page
  // Must be checked before the jobs listing check because /in/ could match before /jobs/
  if (/linkedin\.com/.test(url) && /^\/in\//.test(path) && !/\/company\//.test(path)) {
    console.log('[JHOS] mode: linkedin_profile url:', url)
    return 'linkedin_profile'
  }

  // listing patterns — linkedin /jobs/ is any path under /jobs/ (SPA)
  if (/linkedin\.com/.test(url) && /^\/jobs\//.test(path)) { console.log('[JHOS] mode: listing url:', url); return 'listing' }
  if (/linkedin\.com/.test(url) && url.includes('currentJobId')) { console.log('[JHOS] mode: listing url:', url); return 'listing' }
  if (/indeed\.com/.test(url) && /\/viewjob/.test(path)) { console.log('[JHOS] mode: listing url:', url); return 'listing' }
  if (/glassdoor\.com/.test(url) && /\/(job-listing|Job\/)/.test(path)) { console.log('[JHOS] mode: listing url:', url); return 'listing' }
  if (/wellfound\.com/.test(url) && /\/jobs\//.test(path)) { console.log('[JHOS] mode: listing url:', url); return 'listing' }
  if (/builtin\.com/.test(url) && /\/job\//.test(path)) { console.log('[JHOS] mode: listing url:', url); return 'listing' }

  // form / apply patterns
  if (/greenhouse\.io/.test(url)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/lever\.co/.test(url) && /\/apply/.test(path)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/workday\.com/.test(url) && /\/job\//.test(path)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/myworkdayjobs\.com/.test(url)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/ashbyhq\.com/.test(url)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/smartrecruiters\.com/.test(url)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/icims\.com/.test(url)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/jobvite\.com/.test(url)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/bamboohr\.com/.test(url) && /\/jobs\//.test(path)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/amazon\.jobs/.test(url) && /\/apply/.test(path)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/account\.amazon\.jobs/.test(url)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/careers\.walmart\.com/.test(url) && /\/apply/.test(path)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/linkedin\.com/.test(url) && /\/jobs\/apply/.test(path)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/\/apply\/?$/.test(path) || /\/apply\?/.test(url)) { console.log('[JHOS] mode: form url:', url); return 'form' }
  if (/\/application\/?$/.test(path) || /\/application\?/.test(url)) { console.log('[JHOS] mode: form url:', url); return 'form' }

  console.log('[JHOS] mode: unknown url:', url)
  return 'unknown'
}

// ─────────────────────────────────────────────────────────────
// JOB INFO SCRAPING
// ─────────────────────────────────────────────────────────────
function detectJobInfo() {
  let title = ''
  let company = ''

  const titleSelectors = [
    '.job-details-jobs-unified-top-card__job-title h1',
    '.jobs-unified-top-card__job-title h1',
    '.t-24.t-bold.inline',
    'h1[class*="job-title"]',
    'h1',
  ]
  const companySelectors = [
    '.job-details-jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__company-name a',
    '.jobs-unified-top-card__subtitle-primary-grouping a',
    '[class*="company-name"] a',
  ]

  for (const sel of titleSelectors) {
    const el = document.querySelector(sel)
    const t = el?.textContent?.trim()
    if (t && t.length < 120) { title = t; break }
  }
  for (const sel of companySelectors) {
    const el = document.querySelector(sel)
    const t = el?.textContent?.trim()
    if (t) { company = t; break }
  }

  return { title, company, url: location.href }
}

// ─────────────────────────────────────────────────────────────
// JOB DESCRIPTION SCRAPING
// ─────────────────────────────────────────────────────────────
function scrapeJobDescription() {
  const selectors = [
    '.job-details-about-the-role-module',
    '.jobs-description-content',
    '.jobs-box--fadein',
    '#job-details',
    '.job-view-layout',
    '[class*="description__text"]',
    '.jobs-description',
    '[class*="job-desc"]',
    '[id*="job-description"]',
  ]
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el?.innerText?.length > 200) return el.innerText.trim().slice(0, 6000)
  }
  const candidates = document.querySelectorAll('main, article, [class*="description"], [id*="description"]')
  let best = ''
  candidates.forEach(el => {
    const t = el.innerText?.trim() || ''
    if (t.length > best.length && t.length < 15000) best = t
  })
  return best.slice(0, 6000) || document.body.innerText.slice(0, 6000)
}

// ─────────────────────────────────────────────────────────────
// LINKEDIN PROFILE SCRAPING  — returns raw text for Claude
// ─────────────────────────────────────────────────────────────
function scrapeLinkedInProfileText() {
  // Grab visible text from key sections
  const sections = []

  // Name + headline
  const nameEl = document.querySelector('h1')
  if (nameEl) sections.push('NAME: ' + nameEl.textContent.trim())

  const headlineEl = document.querySelector('.text-body-medium.break-words, [class*="headline"]')
  if (headlineEl) sections.push('HEADLINE: ' + headlineEl.textContent.trim())

  // Location
  const locEl = document.querySelector('.text-body-small.inline.t-black--light.break-words, [class*="top-card"] .t-black--light')
  if (locEl) sections.push('LOCATION: ' + locEl.textContent.trim())

  // Email / phone (contact info panel if open)
  document.querySelectorAll('[href^="mailto:"]').forEach(el => {
    sections.push('EMAIL: ' + el.href.replace('mailto:', ''))
  })
  document.querySelectorAll('[href^="tel:"]').forEach(el => {
    sections.push('PHONE: ' + el.href.replace('tel:', ''))
  })

  // LinkedIn URL (clean, no query params)
  sections.push('LINKEDIN: ' + location.href.split('?')[0])

  // Experience section
  const expSection = document.querySelector('#experience ~ div, section[id*="experience"], [data-section="experience"]')
  if (expSection) {
    sections.push('\nEXPERIENCE SECTION:\n' + expSection.innerText.slice(0, 3000))
  } else {
    // fallback: grab pvs-list items near "Experience" heading
    document.querySelectorAll('.pvs-list__item--line-separated').forEach(item => {
      sections.push(item.innerText.trim().slice(0, 500))
    })
  }

  // Education section
  const eduSection = document.querySelector('#education ~ div, section[id*="education"], [data-section="education"]')
  if (eduSection) {
    sections.push('\nEDUCATION SECTION:\n' + eduSection.innerText.slice(0, 1500))
  }

  // Skills section
  const skillsSection = document.querySelector('#skills ~ div, section[id*="skills"], [data-section="skills"]')
  if (skillsSection) {
    sections.push('\nSKILLS SECTION:\n' + skillsSection.innerText.slice(0, 1000))
  }

  // Fallback: just use visible body text if we got nothing useful
  const combined = sections.join('\n')
  const raw = combined.length < 200 ? document.body.innerText.slice(0, 8000) : combined.slice(0, 8000)

  // Strip control characters that break JSON serialization
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').replace(/\r\n/g, '\n')
}

// ─────────────────────────────────────────────────────────────
// APPLY BUTTON
// ─────────────────────────────────────────────────────────────
function findApplyButton() {
  const selectors = [
    'button.jobs-apply-button',
    '[data-control-name="jobdetails_topcard_inapply"]',
    'button[aria-label*="Easy Apply"]',
    'button[aria-label*="Apply"]',
    '.jobs-s-apply button',
    'a[href*="/apply"]',
  ]
  for (const sel of selectors) {
    for (const el of document.querySelectorAll(sel)) {
      const text = (el.textContent || '').toLowerCase().trim()
      if (text.includes('apply') && !text.includes('applied')) {
        return { found: true, element: el }
      }
    }
  }
  return { found: false }
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR FRAME REFERENCE
// ─────────────────────────────────────────────────────────────
function getSidebarFrame() {
  return document.getElementById('jobhuntos-sidebar-frame')
}

// Single-run guard: prevents EXECUTE_AUTOFILL from firing multiple times
// if the sidebar sends the message more than once (e.g. after re-render).
let autofillInjected = false

function postToSidebar(data) {
  const frame = getSidebarFrame()
  if (frame) frame.contentWindow.postMessage(data, '*')
}

// ─────────────────────────────────────────────────────────────
// CHROME RUNTIME MESSAGES  (from background.js)
// ─────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log('JobHuntOS content received: ' + msg.action)

  if (msg.action === 'getPageData') {
    const mode = detectMode(location.href)
    sendResponse({ mode, jobInfo: detectJobInfo(), jobText: scrapeJobDescription(), url: location.href })
    return false  // sync — close channel immediately
  }

  if (msg.action === 'parseLinkedInProfile') {
    const rawText = scrapeLinkedInProfileText()
    fetch(BACKEND + '/api/parse-linkedin-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, url: location.href })
    })
    .then(r => r.json())
    .then(data => {
      if (data.profile) {
        chrome.storage.local.set({ userProfile: { ...data.profile, setupComplete: true } }, () => {
          console.log('JobHuntOS: profile saved from background trigger', data.profile?.personal?.fullName)
          postToSidebar({ type: 'PROFILE_UPDATED', profile: data.profile })
        })
      }
    })
    .catch(err => console.warn('JobHuntOS: bg profile parse failed', err))
    sendResponse({ ok: true })
    return false  // sync — sendResponse already called above
  }

  // Unknown message — close channel immediately
  return false
})

// ─────────────────────────────────────────────────────────────
// POSTMESSAGE FROM SIDEBAR IFRAME
// ─────────────────────────────────────────────────────────────
const JHOS_MSG_TYPES = new Set([
  'REQUEST_PAGE_DATA', 'CHECK_CURRENT_URL', 'PARSE_LINKEDIN_NOW',
  'CLICK_APPLY_BUTTON', 'SCAN_QUESTIONS', 'EXECUTE_AUTOFILL',
  'CLICK_NEXT_PAGE', 'UNDO_AUTOFILL', 'CLOSE_SIDEBAR',
])

window.addEventListener('message', (event) => {
  const msg = event.data
  // Reject non-JHOS messages immediately (other extensions, LinkedIn scripts, etc.)
  if (!msg || typeof msg.type !== 'string' || !JHOS_MSG_TYPES.has(msg.type)) return

  // Only trust messages from our sidebar iframe — reject if frame exists but source doesn't match
  const frame = getSidebarFrame()
  if (!frame) return  // sidebar not open — no legitimate sender
  if (event.source !== frame.contentWindow) return

  console.log('[JHOS] content received:', msg.type)

  // ── Page data request ──────────────────────────────────────
  if (msg.type === 'REQUEST_PAGE_DATA') {
    const mode = detectMode(location.href)
    console.log('[JHOS] mode:', mode, 'url:', location.href)
    postToSidebar({
      type: 'PAGE_DATA_RESPONSE',
      url: location.href,
      mode,
      jobInfo: detectJobInfo(),
      jobText: scrapeJobDescription(),
    })
  }

  // ── LinkedIn profile check ─────────────────────────────────
  if (msg.type === 'CHECK_CURRENT_URL') {
    const mode = detectMode(location.href)
    const isLinkedInProfile = mode === 'linkedin_profile'
    postToSidebar({
      type: 'CURRENT_URL_RESPONSE',
      url: location.href,
      mode,
      isLinkedInProfile,
    })
  }

  // ── Parse LinkedIn profile now ─────────────────────────────
  if (msg.type === 'PARSE_LINKEDIN_NOW') {
    const rawText = scrapeLinkedInProfileText()
    console.log('JobHuntOS: scraping LinkedIn profile, text length:', rawText.length)

    fetch(BACKEND + '/api/parse-linkedin-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, url: location.href })
    })
    .then(r => r.json())
    .then(data => {
      if (data.error) throw new Error(data.error)
      if (!data.profile) throw new Error('No profile returned from backend')
      const profile = { ...data.profile, setupComplete: true }

      // Route storage write through background to survive context invalidation
      chrome.runtime.sendMessage(
        { action: 'saveProfile', profile },
        (response) => {
          if (chrome.runtime.lastError) {
            // Extension context invalidated — user must reload the tab
            postToSidebar({
              type: 'LINKEDIN_PARSE_ERROR',
              error: 'Extension was reloaded — please refresh this page and try again.'
            })
            return
          }
          if (response?.ok) {
            console.log('JobHuntOS saved LinkedIn profile via background:', profile?.personal?.fullName)
            postToSidebar({ type: 'LINKEDIN_PARSED', profile })
          } else {
            postToSidebar({ type: 'LINKEDIN_PARSE_ERROR', error: response?.error || 'Save failed' })
          }
        }
      )
    })
    .catch(err => {
      console.error('JobHuntOS: LinkedIn parse error', err)
      postToSidebar({ type: 'LINKEDIN_PARSE_ERROR', error: err.message })
    })
  }

  // ── Apply button ───────────────────────────────────────────
  if (msg.type === 'CLICK_APPLY_BUTTON') {
    const result = findApplyButton()
    if (result.found) result.element.click()
  }

  // ── Scan form questions ────────────────────────────────────
  if (msg.type === 'SCAN_QUESTIONS') {
    const questions = []
    const fields = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="password"]):not([type="submit"])' +
      ':not([type="button"]):not([type="reset"]):not([type="file"]):not([type="checkbox"]),' +
      'textarea, select'
    )
    fields.forEach((field, i) => {
      let label = ''
      if (field.id) {
        const lbl = document.querySelector(`label[for="${CSS.escape(field.id)}"]`)
        if (lbl) label = lbl.textContent.trim()
      }
      if (!label) {
        const parent = field.closest('div,li,fieldset,p')
        if (parent) {
          const lbl = parent.querySelector('label')
          if (lbl) label = lbl.textContent.trim()
        }
      }
      if (!label) label = field.placeholder || field.getAttribute('aria-label') || field.name || ('Field ' + (i + 1))

      const options = []
      if (field.tagName === 'SELECT') {
        Array.from(field.options).forEach(o => { if (o.value) options.push(o.text.trim()) })
      }

      questions.push({
        id: field.id || field.name || ('field-' + i),
        label: label.slice(0, 100),
        type: field.tagName === 'SELECT' ? 'select' : field.tagName === 'TEXTAREA' ? 'textarea' : (field.type || 'text'),
        options,
        required: field.required || false,
      })
    })
    postToSidebar({ type: 'QUESTIONS_SCANNED', questions })
  }

  // ── Execute autofill ───────────────────────────────────────
  if (msg.type === 'EXECUTE_AUTOFILL') {
    // Guard: ignore duplicate EXECUTE_AUTOFILL messages on the same page load.
    // Reset happens when URL changes (new page navigation).
    if (autofillInjected) {
      console.log('[JHOS] EXECUTE_AUTOFILL ignored — already injected on this page')
      return
    }
    autofillInjected = true

    // Write to jhos_pending_autofill key — this is what autofill.js reads.
    // Must await storage.set before asking background to inject autofill.js,
    // otherwise autofill.js may run before its data is available.
    chrome.storage.local.get(['appState', 'userProfile'], ({ appState = {}, userProfile = {} }) => {
      const p = userProfile.personal || {}
      const profileLines = [
        p.fullName    ? 'Name: '     + p.fullName  : '',
        p.email       ? 'Email: '    + p.email     : '',
        p.phone       ? 'Phone: '    + p.phone     : '',
        p.city        ? 'Location: ' + [p.city, p.state].filter(Boolean).join(', ') : '',
        p.linkedinUrl ? 'LinkedIn: ' + p.linkedinUrl : '',
        p.githubUrl   ? 'GitHub: '   + p.githubUrl   : '',
      ].filter(Boolean).join('\n')

      chrome.storage.local.set({
        jhos_pending_autofill: {
          autofillValues: msg.autofillData,
          analysisData:   msg.jobAnalysis,
          profileData:    profileLines,
          triggeredAt:    Date.now(),
        },
        appState: {
          ...appState,
          pendingAutofill: {
            data: msg.autofillData,
            jobAnalysis: msg.jobAnalysis,
            timestamp: Date.now(),
            status: 'pending',
          },
        },
      }, () => {
        // Storage write complete — now ask background to inject autofill.js via
        // chrome.scripting.executeScript (MV3-safe, respects page CSP).
        // Never use <script src> injection — it is blocked by third-party CSP.
        chrome.runtime.sendMessage({ action: 'injectAutofill' })
      })
    })
  }

  // ── Next page ──────────────────────────────────────────────
  if (msg.type === 'CLICK_NEXT_PAGE') {
    const patterns = ['next', 'continue', 'proceed', 'save and continue', 'next step']
    for (const btn of document.querySelectorAll('button, input[type="submit"], a[role="button"]')) {
      const text = (btn.textContent || btn.value || '').toLowerCase().trim()
      if (patterns.some(p => text.includes(p)) && !text.includes('back') && !text.includes('prev')) {
        btn.click()
        break
      }
    }
  }

  // ── Undo autofill ──────────────────────────────────────────
  if (msg.type === 'UNDO_AUTOFILL') {
    if (typeof window.jobhuntosUndo === 'function') window.jobhuntosUndo()
  }

  // ── Close sidebar ──────────────────────────────────────────
  if (msg.type === 'CLOSE_SIDEBAR') {
    const f = getSidebarFrame()
    if (f) { f.remove(); document.body.style.marginRight = ''; document.body.style.transition = '' }
  }
})

// ─────────────────────────────────────────────────────────────
// SPA URL CHANGE DETECTION
// MutationObserver watches for URL changes ONLY — never injects DOM elements.
// Debounced so rapid DOM mutations (LinkedIn feed, React renders) don't spam messages.
// ─────────────────────────────────────────────────────────────
let lastUrl = location.href
let urlChangeTimer = null

new MutationObserver(() => {
  const cur = location.href
  if (cur === lastUrl) return  // URL unchanged — exit immediately, no cost
  lastUrl = cur

  // Reset autofill guard on navigation — new page = fresh fill
  autofillInjected = false

  // Debounce: cancel any pending notification from the previous mutation burst
  if (urlChangeTimer) clearTimeout(urlChangeTimer)
  urlChangeTimer = setTimeout(() => {
    urlChangeTimer = null
    const mode = detectMode(cur)
    console.log('[JHOS] mode:', mode, 'url:', cur)
    postToSidebar({ type: 'URL_CHANGED', url: cur, mode, jobInfo: detectJobInfo() })
  }, 1500)
}).observe(document.body, { childList: true, subtree: true })
