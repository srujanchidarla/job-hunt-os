// content.js - Complete rewrite

let sidebarFrame = null

function getCurrentMode() {
  const url = window.location.href
  const listingPatterns = [
    /linkedin\.com\/jobs\/(view|collections|search|recommended)/,
    /linkedin\.com\/jobs\/.*currentJobId/,
    /indeed\.com\/(viewjob|rc\/clk)/,
    /glassdoor\.com\/(job-listing|Job\/)/,
    /wellfound\.com\/jobs\//,
  ]
  const formPatterns = [
    /greenhouse\.io.*\/apply/,
    /lever\.co.*\/apply/,
    /workday\.com.*\/job\//,
    /myworkdayjobs\.com/,
    /ashbyhq\.com/,
    /amazon\.jobs.*\/apply/,
    /careers\.walmart\.com.*\/apply/,
    /linkedin\.com\/jobs\/apply/,
    /\/apply\/?(\?|$)/,
    /\/application\/?(\?|$)/,
  ]
  for (const p of listingPatterns) if (p.test(url)) return 'listing'
  for (const p of formPatterns) if (p.test(url)) return 'form'
  if (/linkedin\.com\/in\/[^/]+\/?$/.test(url)) return 'linkedin_profile'
  return 'unknown'
}

function detectJobInfo() {
  const selectors = {
    linkedin_title: [
      '.job-details-jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title h1',
      '.t-24.t-bold',
      'h1.job-title',
      'h1[class*="job-title"]'
    ],
    linkedin_company: [
      '.job-details-jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__subtitle-primary-grouping a',
      '[class*="company-name"] a'
    ],
    generic_title: ['h1', '[class*="job-title"]', '[class*="jobtitle"]'],
    generic_company: ['[class*="company-name"]', '[class*="employer"]', '.company']
  }

  let title = ''
  let company = ''

  for (const sel of selectors.linkedin_title) {
    const el = document.querySelector(sel)
    if (el?.textContent.trim()) { title = el.textContent.trim(); break }
  }
  for (const sel of selectors.linkedin_company) {
    const el = document.querySelector(sel)
    if (el?.textContent.trim()) { company = el.textContent.trim(); break }
  }
  if (!title) {
    for (const sel of selectors.generic_title) {
      const el = document.querySelector(sel)
      if (el?.textContent.trim().length < 100) { title = el.textContent.trim(); break }
    }
  }

  return { title, company, url: window.location.href }
}

function scrapeJobDescription() {
  const linkedinSelectors = [
    '.job-details-about-the-role-module',
    '.jobs-description-content',
    '.jobs-box--fadein',
    '#job-details',
    '.job-view-layout',
    '[class*="description__text"]',
    '.jobs-description',
  ]

  for (const sel of linkedinSelectors) {
    const el = document.querySelector(sel)
    if (el?.innerText?.length > 200) {
      return el.innerText.trim().slice(0, 6000)
    }
  }

  const candidates = document.querySelectorAll(
    'main, article, [class*="job-desc"], [class*="description"], [id*="description"]'
  )
  let best = ''
  candidates.forEach(el => {
    const text = el.innerText?.trim() || ''
    if (text.length > best.length && text.length < 15000) best = text
  })

  return best.slice(0, 6000) || document.body.innerText.slice(0, 6000)
}

function parseLinkedInProfile() {
  const profile = {
    personal: {},
    workExperience: [],
    education: [],
    projects: [],
    skills: []
  }

  const nameEl = document.querySelector(
    'h1.text-heading-xlarge, h1[class*="name"], .pv-top-card--list li:first-child'
  )
  if (nameEl) {
    const fullName = nameEl.textContent.trim()
    profile.personal.fullName = fullName
    const parts = fullName.split(' ')
    profile.personal.firstName = parts[0] || ''
    profile.personal.lastName = parts.slice(1).join(' ') || ''
  }

  const headlineEl = document.querySelector(
    '.text-body-medium.break-words, [class*="headline"]'
  )
  if (headlineEl) profile.currentRole = { title: headlineEl.textContent.trim() }

  const locationEl = document.querySelector(
    '.pv-top-card--list-bullet li span, .text-body-small.inline.t-black--light.break-words'
  )
  if (locationEl) {
    const loc = locationEl.textContent.trim()
    profile.personal.city = loc.split(',')[0]?.trim() || ''
    profile.personal.state = loc.split(',')[1]?.trim() || ''
  }

  const emailEl = document.querySelector('[href^="mailto:"]')
  if (emailEl) profile.personal.email = emailEl.href.replace('mailto:', '')

  const phoneEl = document.querySelector('[href^="tel:"]')
  if (phoneEl) profile.personal.phone = phoneEl.href.replace('tel:', '')

  profile.personal.linkedinUrl = window.location.href.split('?')[0]

  const expItems = document.querySelectorAll(
    '.experience-section li, [data-field="experience"] li, .pvs-list__item--line-separated'
  )

  expItems.forEach(item => {
    const titleEl = item.querySelector('span[aria-hidden="true"]')
    const companyEl = item.querySelectorAll('span[aria-hidden="true"]')[1]

    if (titleEl?.textContent) {
      profile.workExperience.push({
        title: titleEl.textContent.trim(),
        company: companyEl?.textContent?.trim() || '',
        startDate: '',
        endDate: '',
        current: false,
        bullets: [],
        description: item.innerText?.trim().slice(0, 500) || ''
      })
    }
  })

  const eduItems = document.querySelectorAll(
    '.education-section li, [data-field="education"] li'
  )
  eduItems.forEach(item => {
    const schoolEl = item.querySelector('span[aria-hidden="true"]')
    const degreeEl = item.querySelectorAll('span[aria-hidden="true"]')[1]

    if (schoolEl?.textContent) {
      profile.education.push({
        school: schoolEl.textContent.trim(),
        degree: degreeEl?.textContent?.trim() || '',
        major: '',
        gpa: ''
      })
    }
  })

  const skillItems = document.querySelectorAll(
    '.skill-categories-section span, [data-field="skills"] span[aria-hidden="true"]'
  )
  skillItems.forEach(el => {
    const skill = el.textContent.trim()
    if (skill && skill.length < 50) profile.skills.push(skill)
  })

  profile.rawText = document.body.innerText.slice(0, 8000)

  return profile
}

function findApplyButton() {
  const applySelectors = [
    'button.jobs-apply-button',
    '[data-control-name="jobdetails_topcard_inapply"]',
    'button[aria-label*="Easy Apply"]',
    'button[aria-label*="Apply"]',
    '.jobs-s-apply button',
    'a[href*="/apply"]',
    'button:not([type="submit"])',
  ]

  for (const sel of applySelectors) {
    const elements = document.querySelectorAll(sel)
    for (const el of elements) {
      const text = (el.textContent || el.innerText || '').toLowerCase().trim()
      if (text.includes('apply') && !text.includes('applied')) {
        return { found: true, element: el, text: el.textContent.trim() }
      }
    }
  }
  return { found: false }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getPageData') {
    const mode = getCurrentMode()
    const jobInfo = detectJobInfo()
    const jobText = scrapeJobDescription()
    sendResponse({ mode, jobInfo, jobText, url: window.location.href })
  }

  if (msg.action === 'parseLinkedInProfile') {
    const profileData = parseLinkedInProfile()
    fetch('http://localhost:3000/api/parse-linkedin-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawData: profileData,
        url: window.location.href
      })
    })
    .then(r => r.json())
    .then(data => {
      chrome.storage.local.set({ userProfile: data.profile })
      const frame = document.getElementById('jobhuntos-sidebar-frame')
      if (frame) {
        frame.contentWindow.postMessage({
          type: 'PROFILE_UPDATED',
          profile: data.profile
        }, '*')
      }
    })
    .catch(err => console.warn('Profile parse failed', err))
    sendResponse({ ok: true })
  }

  if (msg.action === 'clickApplyButton') {
    const result = findApplyButton()
    if (result.found) {
      result.element.click()
      sendResponse({ clicked: true, text: result.text })
    } else {
      sendResponse({ clicked: false })
    }
  }

  if (msg.action === 'showAutofillPopup') {
    const script = document.createElement('script')
    script.src = chrome.runtime.getURL('autofill.js')
    document.head.appendChild(script)
    sendResponse({ ok: true })
  }

  return true
})

// Message handler for sidebar postMessage
window.addEventListener('message', (event) => {
  const msg = event.data
  if (!msg || !msg.type) return

  if (msg.type === 'REQUEST_PAGE_DATA') {
    const mode = getCurrentMode()
    const jobInfo = detectJobInfo()
    const jobText = scrapeJobDescription()
    const frame = document.getElementById('jobhuntos-sidebar-frame')
    if (frame) {
      frame.contentWindow.postMessage({
        type: 'PAGE_DATA',
        mode,
        jobInfo,
        jobText,
        url: window.location.href
      }, '*')
    }
  }

  if (msg.type === 'CLICK_APPLY_BUTTON') {
    const result = findApplyButton()
    if (result.found) result.element.click()
  }

  if (msg.type === 'EXECUTE_AUTOFILL') {
    // Store in chrome.storage for autofill.js to pick up
    chrome.storage.local.get('appState', ({ appState = {} }) => {
      chrome.storage.local.set({
        appState: {
          ...appState,
          pendingAutofill: {
            data: msg.autofillData,
            jobAnalysis: msg.jobAnalysis,
            timestamp: Date.now(),
            status: 'pending'
          }
        }
      })
    })
    // Also inject autofill.js
    const script = document.createElement('script')
    script.src = chrome.runtime.getURL('autofill.js')
    document.head.appendChild(script)
  }

  if (msg.type === 'CHECK_LINKEDIN_PROFILE') {
    const isLinkedIn = /linkedin\.com\/in\/[^/]+\/?$/.test(window.location.href)
    const frame = document.getElementById('jobhuntos-sidebar-frame')
    if (frame) {
      frame.contentWindow.postMessage({
        type: 'LINKEDIN_PROFILE_STATUS',
        isLinkedIn,
        url: window.location.href
      }, '*')
    }
  }

  if (msg.type === 'PARSE_LINKEDIN_NOW') {
    const profileData = parseLinkedInProfile()
    fetch('http://localhost:3000/api/parse-linkedin-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawData: profileData, url: window.location.href })
    })
    .then(r => r.json())
    .then(data => {
      chrome.storage.local.set({ userProfile: data.profile })
      const frame = document.getElementById('jobhuntos-sidebar-frame')
      if (frame) {
        frame.contentWindow.postMessage({
          type: 'LINKEDIN_PARSED',
          profile: data.profile
        }, '*')
      }
    })
    .catch(err => {
      const frame = document.getElementById('jobhuntos-sidebar-frame')
      if (frame) {
        frame.contentWindow.postMessage({
          type: 'LINKEDIN_PARSE_ERROR',
          error: err.message
        }, '*')
      }
    })
  }

  if (msg.type === 'CLOSE_SIDEBAR') {
    const frame = document.getElementById('jobhuntos-sidebar-frame')
    if (frame) {
      frame.remove()
      document.body.style.marginRight = ''
      document.body.style.transition = ''
    }
  }
})

// SPA URL change detection
let lastUrl = location.href

const urlObserver = new MutationObserver(() => {
  const currentUrl = location.href
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl

    setTimeout(() => {
      const frame = document.getElementById('jobhuntos-sidebar-frame')
      if (frame) {
        const mode = getCurrentMode()
        const jobInfo = detectJobInfo()
        frame.contentWindow.postMessage({
          type: 'URL_CHANGED',
          url: currentUrl,
          mode,
          jobInfo
        }, '*')
      }
    }, 1500)
  }
})

urlObserver.observe(document.body, {
  childList: true,
  subtree: true
})
