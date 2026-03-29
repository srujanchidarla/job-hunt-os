// sidebar.js — chrome.storage as single source of truth

const BACKEND = 'http://localhost:3000'

// ── INIT ──
async function init() {
  const { userProfile, appState } = await chrome.storage.local.get(['userProfile', 'appState'])

  if (!userProfile?.setupComplete) {
    showScreen('setup')
    initSetupScreen()
    return
  }

  const mode = appState?.currentMode || 'unknown'

  if (mode === 'listing') {
    showScreen('listing')
    await initListingMode(appState, userProfile)
  } else if (mode === 'form') {
    showScreen('form')
    await initFormMode(appState, userProfile)
  } else {
    showScreen('unknown')
    initUnknownScreen()
  }
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.style.display = 'none')
  const screen = document.getElementById('screen-' + name)
  if (screen) screen.style.display = 'flex'
}

// ── MESSAGE LISTENER ──
window.addEventListener('message', async (event) => {
  const msg = event.data
  if (!msg || !msg.type) return

  if (msg.type === 'URL_CHANGED') {
    const { appState = {} } = await chrome.storage.local.get('appState')
    await chrome.storage.local.set({
      appState: { ...appState, currentMode: msg.mode, currentUrl: msg.url }
    })

    if (msg.mode === 'listing' && msg.jobInfo) {
      const titleEl = document.getElementById('detected-job-title')
      const companyEl = document.getElementById('detected-job-company')
      if (titleEl) titleEl.textContent = msg.jobInfo.title || 'Job detected'
      if (companyEl) companyEl.textContent = msg.jobInfo.company || ''

      const { appState: state } = await chrome.storage.local.get('appState')
      if (state?.currentAnalysis?.sourceUrl !== msg.url) {
        const preEl = document.getElementById('pre-analysis')
        const resEl = document.getElementById('analysis-results')
        if (preEl) preEl.style.display = 'block'
        if (resEl) resEl.style.display = 'none'
      }
    }

    const currentScreenMode = document.body.dataset.currentMode
    if (msg.mode !== currentScreenMode) {
      document.body.dataset.currentMode = msg.mode
      const { appState: newState } = await chrome.storage.local.get('appState')
      const { userProfile } = await chrome.storage.local.get('userProfile')
      if (msg.mode === 'listing') {
        showScreen('listing')
        await initListingMode(newState, userProfile)
      } else if (msg.mode === 'form') {
        showScreen('form')
        await initFormMode(newState, userProfile)
      }
    }
  }

  if (msg.type === 'PAGE_DATA') {
    if (msg.jobInfo?.title) setText('detected-job-title', msg.jobInfo.title)
    if (msg.jobInfo?.company) setText('detected-job-company', msg.jobInfo.company)
  }

  if (msg.type === 'PROFILE_UPDATED') {
    renderProfileDisplay(msg.profile)
    renderProfileDisplay(msg.profile, 'form-profile-display')
  }

  if (msg.type === 'LINKEDIN_PROFILE_STATUS') {
    const btn = document.getElementById('parse-linkedin-btn')
    const preview = document.getElementById('linkedin-url-preview')
    if (msg.isLinkedIn) {
      if (btn) btn.disabled = false
      if (preview) preview.textContent = msg.url
    } else {
      if (btn) btn.disabled = true
      if (preview) preview.textContent = 'Not on a LinkedIn profile yet'
    }
  }

  if (msg.type === 'LINKEDIN_PARSED') {
    showProfilePreview(msg.profile, 'linkedin')
  }

  if (msg.type === 'LINKEDIN_PARSE_ERROR') {
    showToast('LinkedIn parse failed: ' + msg.error)
    document.getElementById('setup-parsing').style.display = 'none'
  }

  if (msg.type === 'FILL_PROGRESS') {
    updateFillProgress(msg.filled, msg.total)
  }

  if (msg.type === 'FILL_COMPLETE') {
    onFillComplete(msg.filled, msg.total)
  }
})

// ── TAB SYSTEM ──
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    // Remove old listener by cloning
    const newTab = tab.cloneNode(true)
    tab.parentNode.replaceChild(newTab, tab)
    newTab.addEventListener('click', () => activateTab(newTab.dataset.tab))
  })
}

function activateTab(tabId) {
  const allTabs = document.querySelectorAll('.tab')
  const allContents = document.querySelectorAll('.tab-content')
  allTabs.forEach(t => t.classList.remove('active'))
  allContents.forEach(c => c.classList.remove('active'))

  const tab = document.querySelector(`.tab[data-tab="${tabId}"]`)
  const content = document.getElementById('tab-' + tabId)
  if (tab) tab.classList.add('active')
  if (content) content.classList.add('active')
}

// ── LISTING MODE ──
async function initListingMode(appState, userProfile) {
  // Request page data
  window.parent.postMessage({ type: 'REQUEST_PAGE_DATA' }, '*')

  // Restore prior analysis
  const analysis = appState?.currentAnalysis
  if (analysis?.company) {
    showAnalysisResults(analysis)
    const hint = document.getElementById('recruiter-company-hint')
    if (hint) hint.textContent = 'Find recruiters at ' + analysis.company
  }

  // Wire up buttons (clone to remove old listeners)
  wireBtn('analyze-btn', handleAnalyze)
  wireBtn('humanize-btn', handleHumanize)
  wireBtn('save-notion-btn', handleSaveNotion)
  wireBtn('apply-btn', handleApply)
  wireBtn('find-recruiters-btn', handleFindRecruiters)
  wireBtn('reanalyze-btn', () => {
    const pre = document.getElementById('pre-analysis')
    const res = document.getElementById('analysis-results')
    if (pre) pre.style.display = 'block'
    if (res) res.style.display = 'none'
  })
  wireBtn('close-sidebar-btn', closeSidebar)
  wireBtn('profile-settings-btn', () => showScreen('setup'))
  wireBtn('update-profile-btn', () => showScreen('setup'))
  wireBtn('copy-outreach-btn', () => {
    const el = document.getElementById('outreach-text')
    if (el) copyText(el.textContent)
  })

  // Profile display
  renderProfileDisplay(userProfile)

  initTabs()
}

async function handleAnalyze() {
  window.parent.postMessage({ type: 'REQUEST_PAGE_DATA' }, '*')

  // Wait for PAGE_DATA response
  const pageData = await new Promise(resolve => {
    const handler = (event) => {
      if (event.data?.type === 'PAGE_DATA') {
        window.removeEventListener('message', handler)
        resolve(event.data)
      }
    }
    window.addEventListener('message', handler)
    setTimeout(() => { window.removeEventListener('message', handler); resolve(null) }, 5000)
  })

  if (!pageData || !pageData.jobText || pageData.jobText.length < 100) {
    showError('Could not read job posting. Make sure you\'re on a job listing page.')
    return
  }

  const { userProfile } = await chrome.storage.local.get('userProfile')
  const profileText = buildProfileText(userProfile)

  showAnalyzingState('Analyzing job posting...')

  try {
    const response = await fetch(BACKEND + '/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: pageData.jobText,
        url: pageData.url,
        userProfile: profileText
      })
    })

    const data = await response.json()
    if (!data.success) throw new Error(data.error || 'Analysis failed')

    const analysis = {
      ...data.analysis,
      sourceUrl: pageData.url,
      analyzedAt: new Date().toISOString()
    }

    const { appState = {} } = await chrome.storage.local.get('appState')
    await chrome.storage.local.set({ appState: { ...appState, currentAnalysis: analysis } })

    showAnalysisResults(analysis)
  } catch (err) {
    showError('Analysis failed: ' + err.message)
  }
}

function showAnalysisResults(analysis) {
  const preEl = document.getElementById('pre-analysis')
  const loadEl = document.getElementById('analyzing-state')
  const resEl = document.getElementById('analysis-results')
  if (preEl) preEl.style.display = 'none'
  if (loadEl) loadEl.style.display = 'none'
  if (resEl) resEl.style.display = 'block'

  const score = analysis.fitScore || 0
  const scoreEl = document.getElementById('fit-score-num')
  const circleEl = document.getElementById('fit-score-circle')
  if (scoreEl) scoreEl.textContent = score
  if (circleEl) {
    circleEl.style.borderColor = score >= 80 ? '#00d4aa' : score >= 60 ? '#f59e0b' : '#ef4444'
  }

  setText('result-role', analysis.role || '')
  setText('result-company', analysis.company || '')
  setText('result-reason', analysis.fitReasoning || '')
  setText('mini-kw', (analysis.atsScore?.keyword || '--') + '%')
  setText('mini-fmt', (analysis.atsScore?.format || '--') + '%')
  setText('mini-hum', (analysis.atsScore?.human || '--') + '%')

  const bulletsContainer = document.getElementById('bullets-container')
  if (bulletsContainer && analysis.resumeBullets) {
    bulletsContainer.innerHTML = analysis.resumeBullets.map(b => `
      <div class="bullet-item">
        <span class="bullet-text">${escapeHtml(b)}</span>
        <button class="btn-copy-tiny" onclick="copyText(${JSON.stringify(b)})">Copy</button>
      </div>
    `).join('')
  }

  setText('outreach-text', analysis.outreachMessage || '')

  const applyBtn = document.getElementById('apply-btn')
  if (applyBtn) applyBtn.textContent = '🚀 Apply at ' + (analysis.company || 'Company')

  renderATSTab(analysis.atsScore)
}

async function handleHumanize() {
  const { appState } = await chrome.storage.local.get('appState')
  const analysis = appState?.currentAnalysis
  if (!analysis?.resumeBullets) { showToast('Analyze a job first'); return }

  const btn = document.getElementById('humanize-btn')
  if (btn) { btn.textContent = 'Humanizing...'; btn.disabled = true }

  try {
    const response = await fetch(BACKEND + '/api/humanize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bullets: analysis.resumeBullets })
    })
    const data = await response.json()

    const { appState: state = {} } = await chrome.storage.local.get('appState')
    const updated = { ...state, currentAnalysis: { ...state.currentAnalysis, resumeBullets: data.bullets } }
    await chrome.storage.local.set({ appState: updated })

    const bulletsContainer = document.getElementById('bullets-container')
    if (bulletsContainer) {
      bulletsContainer.innerHTML = data.bullets.map(b => `
        <div class="bullet-item humanized">
          <span class="bullet-text">${escapeHtml(b)}</span>
          <button class="btn-copy-tiny" onclick="copyText(${JSON.stringify(b)})">Copy</button>
        </div>
      `).join('')
    }
    showToast('Bullets humanized!')
  } catch (err) {
    showToast('Humanize failed: ' + err.message)
  } finally {
    if (btn) { btn.textContent = '✦ Humanize Bullets'; btn.disabled = false }
  }
}

async function handleSaveNotion() {
  const { appState, userProfile } = await chrome.storage.local.get(['appState', 'userProfile'])
  const analysis = appState?.currentAnalysis
  if (!analysis) { showToast('Analyze a job first'); return }

  const btn = document.getElementById('save-notion-btn')
  if (btn) { btn.textContent = 'Saving...'; btn.disabled = true }

  try {
    const response = await fetch(BACKEND + '/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis, notionKey: userProfile?.notionKey })
    })
    const data = await response.json()
    if (data.success) {
      showToast('Saved to Notion!')
      const { appState: state = {} } = await chrome.storage.local.get('appState')
      await chrome.storage.local.set({
        appState: { ...state, currentAnalysis: { ...state.currentAnalysis, notionPageId: data.pageId } }
      })
      if (btn) btn.textContent = '✓ Saved to Notion'
    } else {
      throw new Error(data.error)
    }
  } catch (err) {
    showToast('Save failed: ' + err.message)
    if (btn) { btn.textContent = '💾 Save to Notion'; btn.disabled = false }
  }
}

async function handleApply() {
  const { userProfile, appState } = await chrome.storage.local.get(['userProfile', 'appState'])
  const analysis = appState?.currentAnalysis
  if (!analysis) { showToast('Please analyze the job first'); return }

  const btn = document.getElementById('apply-btn')
  if (btn) { btn.textContent = 'Preparing...'; btn.disabled = true }

  try {
    const profileText = buildProfileText(userProfile)
    const response = await fetch(BACKEND + '/api/generate-autofill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile: profileText, jobAnalysis: analysis, questions: [] })
    })
    const data = await response.json()

    const { appState: state = {} } = await chrome.storage.local.get('appState')
    await chrome.storage.local.set({
      appState: {
        ...state,
        pendingAutofill: {
          data: data.autofillData,
          jobAnalysis: analysis,
          timestamp: Date.now(),
          status: 'pending',
          sourceUrl: appState?.currentUrl
        }
      }
    })

    if (btn) { btn.textContent = '✓ Ready — Click Apply on page'; btn.style.background = '#00d4aa' }
    window.parent.postMessage({ type: 'CLICK_APPLY_BUTTON' }, '*')
  } catch (err) {
    if (btn) { btn.textContent = '🚀 Apply Now'; btn.disabled = false }
    showError('Failed: ' + err.message)
  }
}

async function handleFindRecruiters() {
  const { appState } = await chrome.storage.local.get('appState')
  const analysis = appState?.currentAnalysis
  if (!analysis?.company) { showToast('Analyze a job first to get company name'); return }

  const preEl = document.getElementById('recruiters-pre')
  const loadEl = document.getElementById('recruiters-loading')
  const resEl = document.getElementById('recruiters-results')
  if (preEl) preEl.style.display = 'none'
  if (loadEl) loadEl.style.display = 'block'

  try {
    const response = await fetch(BACKEND + '/api/find-recruiters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: analysis.company, role: analysis.role })
    })
    const data = await response.json()

    if (loadEl) loadEl.style.display = 'none'
    if (resEl) {
      resEl.style.display = 'block'
      if (data.recruiters?.length > 0) {
        resEl.innerHTML = data.recruiters.map(r => `
          <div class="recruiter-card">
            <div class="rec-name">${escapeHtml(r.name || '')}</div>
            <div class="rec-title">${escapeHtml(r.title || '')}</div>
            <div class="rec-email" onclick="copyText('${escapeAttr(r.email || '')}')">
              ${escapeHtml(r.email || 'Email not found')}
            </div>
          </div>
        `).join('')
      } else {
        resEl.innerHTML = '<div class="empty-state">No recruiters found for ' + escapeHtml(analysis.company) + '</div>'
      }
    }
  } catch (err) {
    if (loadEl) loadEl.style.display = 'none'
    if (preEl) preEl.style.display = 'block'
    showToast('Failed to find recruiters: ' + err.message)
  }
}

function renderATSTab(atsScore) {
  if (!atsScore) return
  const emptyEl = document.getElementById('ats-empty')
  const contentEl = document.getElementById('ats-content')
  if (emptyEl) emptyEl.style.display = 'none'
  if (contentEl) contentEl.style.display = 'block'

  const overall = Math.round((
    (atsScore.keyword || 0) + (atsScore.format || 0) + (atsScore.human || 0)
  ) / 3)
  setText('ats-overall-score', overall + '%')

  const foundList = document.getElementById('kw-found-list')
  const missingList = document.getElementById('kw-missing-list')
  if (foundList && atsScore.foundKeywords) {
    foundList.innerHTML = atsScore.foundKeywords.map(k =>
      `<span class="kw-pill found">${escapeHtml(k)}</span>`
    ).join('')
  }
  if (missingList && atsScore.missingKeywords) {
    missingList.innerHTML = atsScore.missingKeywords.map(k =>
      `<span class="kw-pill missing">${escapeHtml(k)}</span>`
    ).join('')
  }

  const suggestionsEl = document.getElementById('ats-suggestions')
  if (suggestionsEl && atsScore.suggestions) {
    suggestionsEl.innerHTML = atsScore.suggestions.map(s =>
      `<div class="suggestion-item">• ${escapeHtml(s)}</div>`
    ).join('')
  }
}

// ── FORM MODE ──
async function initFormMode(appState, userProfile) {
  const analysis = appState?.currentAnalysis

  if (analysis?.role) {
    setText('form-job-role', analysis.role)
    setText('form-job-company', analysis.company || '')

    const badge = document.getElementById('form-fit-badge')
    if (badge && analysis.fitScore) {
      const color = analysis.fitScore >= 80 ? '#00d4aa' : analysis.fitScore >= 60 ? '#f59e0b' : '#ef4444'
      badge.innerHTML = `<span style="color:${color};font-weight:700;font-size:18px">${analysis.fitScore}</span><span style="color:#94a3b8;font-size:10px">/100</span>`
    }

    renderFormKeywords(analysis.atsScore)
  } else {
    const nudge = document.getElementById('analyze-nudge')
    if (nudge) nudge.style.display = 'block'
    setText('form-job-role', 'Application Form')
  }

  setTimeout(scanPageQuestions, 1000)

  wireBtn('autofill-page-btn', handleAutofill)
  wireBtn('next-page-btn', handleNextPage)
  wireBtn('close-form-btn', closeSidebar)
  wireBtn('undo-fill-btn', handleUndoFill)
  wireBtn('gen-cover-btn', handleGenCover)
  wireBtn('copy-cover-btn', () => {
    const el = document.getElementById('cover-letter-text')
    if (el) copyText(el.textContent)
  })

  renderProfileDisplay(userProfile, 'form-profile-display')

  initTabs()
}

async function scanPageQuestions() {
  return new Promise(resolve => {
    window.parent.postMessage({ type: 'SCAN_QUESTIONS' }, '*')

    const handler = (event) => {
      if (event.data?.type === 'QUESTIONS_SCANNED') {
        window.removeEventListener('message', handler)
        renderQuestions(event.data.questions || [])
        resolve(event.data.questions || [])
      }
    }
    window.addEventListener('message', handler)

    // Fallback: if no response in 3s, show empty state
    setTimeout(() => {
      window.removeEventListener('message', handler)
      const badge = document.getElementById('q-count-badge')
      if (badge && badge.textContent === 'Scanning...') {
        badge.textContent = '0 found'
      }
      resolve([])
    }, 3000)
  })
}

function renderQuestions(questions) {
  const list = document.getElementById('questions-list')
  const badge = document.getElementById('q-count-badge')
  if (badge) badge.textContent = questions.length + ' found'
  if (!list) return

  if (questions.length === 0) {
    list.innerHTML = '<div class="q-empty">No questions detected on this page</div>'
    return
  }

  list.innerHTML = questions.map((q, i) => `
    <div class="question-item" id="q-item-${i}">
      <div class="q-status" id="q-status-${i}"></div>
      <div class="q-text">${escapeHtml(q.label || q.placeholder || 'Field ' + (i+1))}</div>
      <div class="q-type">${escapeHtml(q.type || 'text')}</div>
    </div>
  `).join('')
}

function setQuestionStatus(index, status) {
  const statusEl = document.getElementById('q-status-' + index)
  const itemEl = document.getElementById('q-item-' + index)
  if (statusEl) {
    statusEl.className = 'q-status ' + status
    statusEl.textContent = status === 'filling' ? '...' : status === 'filled' ? '✓' : status === 'failed' ? '✗' : ''
  }
  if (itemEl) {
    itemEl.className = 'question-item ' + status
  }
}

function updateFillProgress(filled, total) {
  const undoRow = document.getElementById('undo-row')
  const countEl = document.getElementById('filled-count')
  if (undoRow) undoRow.style.display = 'flex'
  if (countEl) countEl.textContent = filled + ' of ' + total + ' fields filled'
}

function onFillComplete(filled, total) {
  const btn = document.getElementById('autofill-page-btn')
  if (btn) {
    btn.textContent = '✓ Filled ' + filled + ' fields'
    btn.disabled = false
    btn.style.background = '#00d4aa'
  }
  updateFillProgress(filled, total)
  showToast('Filled ' + filled + ' fields!')
  updateTimeSaved(2)
}

async function handleAutofill() {
  const btn = document.getElementById('autofill-page-btn')
  if (btn) { btn.textContent = 'Preparing...'; btn.disabled = true }

  const { userProfile, appState } = await chrome.storage.local.get(['userProfile', 'appState'])

  try {
    const profileText = buildProfileText(userProfile)
    const analysis = appState?.currentAnalysis || {}
    const questions = await scanPageQuestions()

    const response = await fetch(BACKEND + '/api/generate-autofill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userProfile: profileText, jobAnalysis: analysis, questions })
    })

    const data = await response.json()

    const { appState: state = {} } = await chrome.storage.local.get('appState')
    await chrome.storage.local.set({
      appState: {
        ...state,
        pendingAutofill: {
          data: data.autofillData,
          jobAnalysis: analysis,
          timestamp: Date.now(),
          status: 'pending'
        }
      }
    })

    window.parent.postMessage({
      type: 'EXECUTE_AUTOFILL',
      autofillData: data.autofillData,
      jobAnalysis: analysis
    }, '*')

    if (btn) btn.textContent = 'Filling form...'
  } catch (err) {
    if (btn) { btn.textContent = '⚡ Autofill This Page'; btn.disabled = false }
    showError('Autofill failed: ' + err.message)
  }
}

async function handleNextPage() {
  window.parent.postMessage({ type: 'CLICK_NEXT_PAGE' }, '*')
  setTimeout(scanPageQuestions, 2000)

  const badge = document.getElementById('step-badge')
  if (badge) {
    const current = parseInt(badge.textContent.replace('Step ', '')) || 1
    badge.textContent = 'Step ' + (current + 1)
  }
}

async function handleUndoFill() {
  window.parent.postMessage({ type: 'UNDO_AUTOFILL' }, '*')
  const btn = document.getElementById('autofill-page-btn')
  if (btn) { btn.textContent = '⚡ Autofill This Page'; btn.disabled = false; btn.style.background = '' }
  const undoRow = document.getElementById('undo-row')
  if (undoRow) undoRow.style.display = 'none'
}

async function handleGenCover() {
  const { userProfile, appState } = await chrome.storage.local.get(['userProfile', 'appState'])
  const analysis = appState?.currentAnalysis
  const btn = document.getElementById('gen-cover-btn')
  if (btn) { btn.textContent = 'Generating...'; btn.disabled = true }

  try {
    const response = await fetch(BACKEND + '/api/answer-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: [{ label: 'Cover Letter', type: 'textarea' }],
        userProfile: buildProfileText(userProfile),
        jobAnalysis: analysis || {}
      })
    })
    const data = await response.json()
    const coverText = data.answers?.[0]?.value || ''
    setText('cover-letter-text', coverText)
    setText('cover-status', 'Generated')
  } catch (err) {
    showToast('Failed to generate cover letter')
  } finally {
    if (btn) { btn.textContent = 'Generate'; btn.disabled = false }
  }
}

function renderFormKeywords(atsScore) {
  if (!atsScore) return

  const found = atsScore.foundKeywords || []
  const missing = atsScore.missingKeywords || []
  const total = found.length + missing.length
  const pct = total > 0 ? Math.round((found.length / total) * 100) : 0

  const gaugeEl = document.getElementById('kw-gauge-fill')
  const pctEl = document.getElementById('kw-gauge-pct')
  const statusEl = document.getElementById('kw-match-status')

  if (gaugeEl) {
    const circumference = 157
    const offset = circumference - (pct / 100) * circumference
    gaugeEl.style.strokeDashoffset = offset
    gaugeEl.style.stroke = pct >= 70 ? '#00d4aa' : pct >= 50 ? '#f59e0b' : '#ef4444'
  }
  if (pctEl) pctEl.textContent = pct + '%'
  if (statusEl) statusEl.textContent = pct + '% Keyword Match'

  const foundEl = document.getElementById('form-kw-found')
  const missingEl = document.getElementById('form-kw-missing')
  if (foundEl) foundEl.innerHTML = found.map(k => `<span class="kw-pill found">${escapeHtml(k)}</span>`).join('')
  if (missingEl) missingEl.innerHTML = missing.map(k => `<span class="kw-pill missing">${escapeHtml(k)}</span>`).join('')
}

// ── SETUP SCREEN ──
function initSetupScreen() {
  document.querySelectorAll('.setup-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.setup-tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.setup-content').forEach(c => c.classList.remove('active'))
      tab.classList.add('active')
      const content = document.getElementById('setup-' + tab.dataset.tab)
      if (content) content.classList.add('active')
    })
  })

  window.parent.postMessage({ type: 'CHECK_LINKEDIN_PROFILE' }, '*')

  wireBtn('parse-linkedin-btn', () => {
    showSetupParsing()
    window.parent.postMessage({ type: 'PARSE_LINKEDIN_NOW' }, '*')
  })

  const uploadZone = document.getElementById('upload-zone')
  const fileInput = document.getElementById('resume-file')

  uploadZone?.addEventListener('click', () => fileInput?.click())
  uploadZone?.addEventListener('dragover', e => {
    e.preventDefault()
    uploadZone.classList.add('drag-over')
  })
  uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'))
  uploadZone?.addEventListener('drop', e => {
    e.preventDefault()
    uploadZone.classList.remove('drag-over')
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  })
  fileInput?.addEventListener('change', e => {
    if (e.target.files[0]) handleFileUpload(e.target.files[0])
  })

  wireBtn('parse-paste-btn', async () => {
    const text = document.getElementById('paste-resume-text')?.value.trim()
    if (!text || text.length < 100) { showToast('Please paste more resume text'); return }
    await parseProfileFromText(text, 'paste')
  })

  wireBtn('save-profile-btn', async () => {
    const profileData = window._parsedProfileData
    if (!profileData) return
    await chrome.storage.local.set({ userProfile: { ...profileData, setupComplete: true } })
    await init()
  })
}

function showSetupParsing() {
  document.querySelectorAll('.setup-content').forEach(c => c.style.display = 'none')
  const parsingEl = document.getElementById('setup-parsing')
  if (parsingEl) parsingEl.style.display = 'flex'
}

async function handleFileUpload(file) {
  if (!file.name.match(/\.(pdf|docx)$/i)) { showToast('Please upload a PDF or DOCX file'); return }

  showSetupParsing()

  const formData = new FormData()
  formData.append('resume', file)

  try {
    const response = await fetch(BACKEND + '/api/parse-resume-file', { method: 'POST', body: formData })
    const data = await response.json()
    showProfilePreview(data.profile, 'upload')
  } catch (err) {
    showToast('Failed to parse resume: ' + err.message)
    document.getElementById('setup-parsing').style.display = 'none'
  }
}

async function parseProfileFromText(text, method) {
  showSetupParsing()
  try {
    const response = await fetch(BACKEND + '/api/parse-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    const data = await response.json()
    showProfilePreview(data.profile, method)
  } catch (err) {
    showToast('Failed to parse profile')
    document.getElementById('setup-parsing').style.display = 'none'
  }
}

function showProfilePreview(profile, method) {
  window._parsedProfileData = { ...profile, setupMethod: method }

  const parsingEl = document.getElementById('setup-parsing')
  const previewEl = document.getElementById('setup-preview')
  if (parsingEl) parsingEl.style.display = 'none'
  if (previewEl) previewEl.style.display = 'block'

  const fields = document.getElementById('preview-fields')
  if (!fields) return

  const p = profile.personal || {}
  fields.innerHTML = `
    <div class="preview-field"><span>Name:</span> ${escapeHtml(p.fullName || '-')}</div>
    <div class="preview-field"><span>Email:</span> ${escapeHtml(p.email || '-')}</div>
    <div class="preview-field"><span>Phone:</span> ${escapeHtml(p.phone || '-')}</div>
    <div class="preview-field"><span>LinkedIn:</span> ${escapeHtml(p.linkedinUrl || '-')}</div>
    <div class="preview-field"><span>GitHub:</span> ${escapeHtml(p.githubUrl || '-')}</div>
    <div class="preview-field"><span>Experience:</span> ${(profile.workExperience || []).length} roles</div>
    <div class="preview-field"><span>Education:</span> ${(profile.education || []).length} degrees</div>
    <div class="preview-field"><span>Skills:</span> ${(profile.skills || []).slice(0, 5).join(', ')}...</div>
  `
}

// ── PROFILE DISPLAY ──
function renderProfileDisplay(profile, containerId = 'profile-display') {
  const container = document.getElementById(containerId)
  if (!container || !profile) return

  const p = profile.personal || {}
  const exp = profile.workExperience || []
  const edu = profile.education || []

  container.innerHTML = `
    <div class="profile-section">
      <div class="ps-title">Contact</div>
      ${copyField('Name', p.fullName)}
      ${copyField('Email', p.email)}
      ${copyField('Phone', p.phone)}
      ${copyField('Location', [p.city, p.state].filter(Boolean).join(', '))}
    </div>
    <div class="profile-section">
      <div class="ps-title">Links</div>
      ${copyField('LinkedIn', p.linkedinUrl)}
      ${copyField('GitHub', p.githubUrl)}
      ${copyField('Portfolio', p.portfolioUrl)}
    </div>
    ${exp.length > 0 ? `
    <div class="profile-section">
      <div class="ps-title">Experience</div>
      ${exp.map(e => `
        <div class="profile-exp-item">
          <div class="exp-title">${escapeHtml(e.title || '')}</div>
          <div class="exp-company">${escapeHtml(e.company || '')}</div>
          ${(e.bullets || []).map(b => copyField('', b, true)).join('') || copyField('', e.description || '', true)}
        </div>
      `).join('')}
    </div>
    ` : ''}
    ${edu.length > 0 ? `
    <div class="profile-section">
      <div class="ps-title">Education</div>
      ${edu.map(e => `
        <div class="profile-exp-item">
          ${copyField('', (e.degree || '') + ' — ' + (e.school || ''), true)}
          ${e.gpa ? copyField('GPA', e.gpa) : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}
    ${(profile.skills || []).length > 0 ? `
    <div class="profile-section">
      <div class="ps-title">Skills</div>
      <div class="skills-wrap" onclick="copyText(${JSON.stringify((profile.skills||[]).join(', '))})">
        ${(profile.skills || []).map(s => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('')}
      </div>
    </div>
    ` : ''}
  `
}

function copyField(label, value, isBullet = false) {
  if (!value) return ''
  const safeVal = escapeHtml(value)
  const jsonVal = JSON.stringify(value)
  if (isBullet) {
    return `<div class="profile-bullet" onclick="copyText(${jsonVal})">• ${safeVal}</div>`
  }
  return `
    <div class="profile-item" onclick="copyText(${jsonVal})">
      ${label ? `<span class="pi-label">${label}</span>` : ''}
      <span class="pi-value">${safeVal}</span>
      <span class="pi-copy">📋</span>
    </div>
  `
}

// ── UNKNOWN SCREEN ──
function initUnknownScreen() {
  wireBtn('go-linkedin-btn', () => {
    chrome.runtime.sendMessage({ action: 'openUrl', url: 'https://www.linkedin.com/jobs/' })
  })
}

// ── UTILITIES ──
function setText(id, text) {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}

function showAnalyzingState(msg) {
  const preEl = document.getElementById('pre-analysis')
  const loadEl = document.getElementById('analyzing-state')
  const resEl = document.getElementById('analysis-results')
  if (preEl) preEl.style.display = 'none'
  if (resEl) resEl.style.display = 'none'
  if (loadEl) {
    loadEl.style.display = 'flex'
    const textEl = document.getElementById('analyze-loading-text')
    if (textEl) textEl.textContent = msg
  }
}

function showError(msg) {
  const loadEl = document.getElementById('analyzing-state')
  const preEl = document.getElementById('pre-analysis')
  if (loadEl) loadEl.style.display = 'none'
  if (preEl) preEl.style.display = 'block'
  showToast(msg)
}

function showToast(msg) {
  let toast = document.getElementById('jhos-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'jhos-toast'
    toast.style.cssText = `
      position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
      background:#1e1e2e;color:#e2e8f0;padding:8px 16px;border-radius:8px;
      font-size:13px;z-index:9999;border:1px solid rgba(255,255,255,0.1);
      box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:opacity 0.3s;
    `
    document.body.appendChild(toast)
  }
  toast.textContent = msg
  toast.style.opacity = '1'
  clearTimeout(toast._timeout)
  toast._timeout = setTimeout(() => { toast.style.opacity = '0' }, 3000)
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied!')).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    showToast('Copied!')
  })
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(str) {
  if (!str) return ''
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;')
}

function closeSidebar() {
  window.parent.postMessage({ type: 'CLOSE_SIDEBAR' }, '*')
}

function toggleSection(headerEl) {
  const body = headerEl.nextElementSibling
  const toggle = headerEl.querySelector('.toggle')
  if (!body) return
  const isOpen = body.style.display !== 'none'
  body.style.display = isOpen ? 'none' : 'block'
  if (toggle) toggle.textContent = isOpen ? '▶' : '▼'
}

function wireBtn(id, handler) {
  const el = document.getElementById(id)
  if (!el) return
  const newEl = el.cloneNode(true)
  el.parentNode.replaceChild(newEl, el)
  newEl.addEventListener('click', handler)
}

function buildProfileText(profile) {
  if (!profile) return ''
  const p = profile.personal || {}
  const lines = [
    p.fullName ? 'Name: ' + p.fullName : '',
    p.email ? 'Email: ' + p.email : '',
    p.phone ? 'Phone: ' + p.phone : '',
    p.city ? 'Location: ' + [p.city, p.state].filter(Boolean).join(', ') : '',
    p.linkedinUrl ? 'LinkedIn: ' + p.linkedinUrl : '',
    p.githubUrl ? 'GitHub: ' + p.githubUrl : '',
    '',
    'WORK EXPERIENCE:',
    ...(profile.workExperience || []).map(e =>
      `${e.title} at ${e.company}\n${(e.bullets || []).join('\n') || e.description || ''}`
    ),
    '',
    'EDUCATION:',
    ...(profile.education || []).map(e =>
      `${e.degree} - ${e.school}${e.gpa ? ' (GPA: ' + e.gpa + ')' : ''}`
    ),
    '',
    'SKILLS: ' + (profile.skills || []).join(', '),
    '',
    ...(profile.projects || []).map(proj =>
      `PROJECT: ${proj.name}\n${proj.description || ''}`
    )
  ]
  return lines.filter(Boolean).join('\n')
}

async function updateTimeSaved(minutesAdded) {
  const { timeSaved = 0 } = await chrome.storage.local.get('timeSaved')
  const newTotal = timeSaved + minutesAdded
  await chrome.storage.local.set({ timeSaved: newTotal })
}

// ── BOOTSTRAP ──
document.addEventListener('DOMContentLoaded', init)
