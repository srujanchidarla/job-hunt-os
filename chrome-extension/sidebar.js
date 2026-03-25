(() => {
  const BACKEND               = 'http://localhost:3000/api';
  const BACKEND_ANALYZE_STREAM = BACKEND + '/analyze-stream';
  const BACKEND_SAVE           = BACKEND + '/save';
  const BACKEND_HUMANIZE       = BACKEND + '/humanize';
  const BACKEND_GENERATE_RESUME = BACKEND + '/generate-resume';
  const JHOS_STORAGE_KEY       = 'jhos_pending_autofill';

  const AI_BUZZWORDS = ['leverage', 'utilize', 'synergy', 'spearheaded', 'orchestrated',
    'deliverables', 'robust', 'innovative', 'cutting-edge', 'empower', 'transformative',
    'holistic', 'paradigm', 'ecosystem', 'streamline'];

  const $ = (id) => document.getElementById(id);

  // ── Global state ──
  let userProfile     = null;
  let lastAnalysis    = null;
  let savedUrl        = null;
  let savedPageId     = null;
  let pagePayload     = null;
  let currentUrl      = null;
  let hasAnalyzed     = false;
  let autoReanalyze   = false;
  let atsCollapsed    = false;
  let autofillActive  = false;
  let currentMode     = 'listing';
  let scannedQuestions = [];
  let timeSavedMinutes = 0;

  // ── Mode switching ──

  function setMode(mode) {
    if (currentMode === mode) return;
    currentMode = mode;
    const app = document.getElementById('app');
    app.classList.remove('mode-listing', 'mode-form');
    app.classList.add('mode-' + mode);

    if (mode === 'listing') {
      activateTab('analyze');
    } else {
      activateTab('autofill');
      setTimeout(() => requestQuestionScan(), 800);
    }
  }

  // ── Tab switching ──

  function activateTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));

    const tabEl = document.querySelector(`.tab[data-tab="${tabId}"]`);
    if (tabEl) tabEl.classList.add('active');

    const panelId = tabId === 'profile'      ? 'panel-profile'      :
                    tabId === 'profile-form'  ? 'panel-profile-form' :
                    'panel-' + tabId;
    const panel = $(panelId);
    if (panel) panel.classList.remove('hidden');

    // When switching to profile tabs, render profile
    if (tabId === 'profile') renderProfileTab('profileContent');
    if (tabId === 'profile-form') renderProfileTab('profileFormContent');

    // When switching to keywords tab in form mode, populate if we have analysis
    if (tabId === 'keywords' && lastAnalysis) renderKeywordsTab(lastAnalysis);
  }

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  });

  // ── Setup overlay ──

  const setupOverlay = $('setupOverlay');
  function showSetup() { setupOverlay.classList.remove('hidden'); }
  function hideSetup() { setupOverlay.classList.add('hidden'); }

  // On load: check for existing profile
  chrome.storage.local.get(['setupComplete', 'userProfile'], (result) => {
    if (result.setupComplete && result.userProfile) {
      userProfile = result.userProfile;
      $('setupSkipBtn').classList.remove('hidden');
    } else {
      showSetup();
    }
  });

  $('gearBtn').addEventListener('click', () => {
    switchSetupTab('upload');
    showSetup();
  });

  // ── Setup: tab switching ──

  let activeSetupTab = 'upload';

  function switchSetupTab(tab) {
    activeSetupTab = tab;
    document.querySelectorAll('.setup-tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
    document.querySelectorAll('.setup-tab-panel').forEach(p =>
      p.classList.toggle('hidden', p.id !== `stab-${tab}`)
    );
    hideSetupStatus();
  }

  document.querySelectorAll('.setup-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSetupTab(btn.dataset.tab));
  });

  // ── Setup: file upload ──

  let setupSelectedFile = null;

  const setupDropzone  = $('setupDropzone');
  const setupFileInput = $('setupFileInput');

  $('setupBrowseBtn').addEventListener('click', (e) => { e.stopPropagation(); setupFileInput.click(); });
  setupDropzone.addEventListener('click', () => setupFileInput.click());

  setupDropzone.addEventListener('dragover', (e) => { e.preventDefault(); setupDropzone.classList.add('drag-over'); });
  setupDropzone.addEventListener('dragleave', () => setupDropzone.classList.remove('drag-over'));
  setupDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    setupDropzone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleSetupFile(e.dataTransfer.files[0]);
  });

  setupFileInput.addEventListener('change', () => {
    if (setupFileInput.files[0]) handleSetupFile(setupFileInput.files[0]);
  });

  $('setupClearFileBtn').addEventListener('click', () => {
    setupSelectedFile = null;
    setupFileInput.value = '';
    $('setupFileSelected').classList.add('hidden');
    $('setupDropzone').classList.remove('hidden');
    hideSetupStatus();
  });

  function handleSetupFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      showSetupStatus('Only PDF and DOCX files are supported.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showSetupStatus('File too large — max 5MB.', 'error');
      return;
    }
    setupSelectedFile = file;
    $('setupFileName').textContent = file.name;
    $('setupFileSelected').classList.remove('hidden');
    $('setupDropzone').classList.add('hidden');
    hideSetupStatus();
  }

  // ── Setup: LinkedIn extraction ──

  $('setupLinkedInBtn').addEventListener('click', async () => {
    const btn  = $('setupLinkedInBtn');
    const hint = $('setupLinkedInHint');
    btn.disabled = true;
    btn.textContent = 'Extracting…';
    hideSetupStatus();

    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'GET_PAGE_TEXT' }, (resp) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(resp);
        });
      });

      if (!response?.url?.includes('linkedin.com/in/')) {
        hint.textContent = '⚠ Please navigate to your LinkedIn profile page first (linkedin.com/in/yourname)';
        btn.disabled = false;
        btn.textContent = 'Extract from Current LinkedIn Page';
        return;
      }

      const text = response.rawText || '';
      if (text.length < 100) {
        showSetupStatus('Not enough text extracted. Try the Paste Resume tab instead.', 'error');
        btn.disabled = false;
        btn.textContent = 'Extract from Current LinkedIn Page';
        return;
      }

      await parseTextAndSave(text);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Extract from Current LinkedIn Page';
      showSetupStatus(`Error: ${err.message}`, 'error');
    }
  });

  // ── Setup: paste char count ──

  $('setupPasteArea').addEventListener('input', () => {
    const len = $('setupPasteArea').value.length;
    $('setupCharCount').textContent = `${len} character${len === 1 ? '' : 's'}`;
  });

  // ── Setup: status helpers ──

  function showSetupStatus(msg, type = 'info') {
    const el = $('setupStatus');
    el.className = `setup-status ${type}`;
    $('setupStatusMsg').textContent = msg;
    el.classList.remove('hidden');
  }

  function hideSetupStatus() {
    $('setupStatus').classList.add('hidden');
  }

  // ── Setup: save button ──

  function setSetupSaving() {
    const btn = $('setupSaveBtn');
    btn.disabled = true;
    $('setupSaveBtnInner').innerHTML = `<span class="setup-spinner"></span> Parsing your profile…`;
  }

  function setSetupIdle() {
    $('setupSaveBtn').disabled = false;
    $('setupSaveBtnInner').textContent = 'Save Profile & Continue →';
  }

  $('setupSaveBtn').addEventListener('click', () => runSetupSave());

  async function runSetupSave() {
    hideSetupStatus();

    if (activeSetupTab === 'upload') {
      if (!setupSelectedFile) {
        showSetupStatus('Please select a PDF or DOCX file first.', 'error');
        return;
      }
      await parseFileAndSave(setupSelectedFile);

    } else if (activeSetupTab === 'paste') {
      const text = $('setupPasteArea').value.trim();
      if (text.length < 100) {
        showSetupStatus('Please paste more resume text (at least 100 characters).', 'error');
        return;
      }
      await parseTextAndSave(text);

    } else if (activeSetupTab === 'linkedin') {
      showSetupStatus('Click the blue "Extract from Current LinkedIn Page" button above.', 'info');
    }
  }

  async function parseFileAndSave(file) {
    setSetupSaving();
    try {
      const base64 = await fileToBase64(file);
      const ext    = file.name.split('.').pop().toLowerCase();
      const res = await fetch(BACKEND + '/parse-profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fileBase64: base64, fileType: ext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await persistProfile(data.parsedProfile);
    } catch (err) {
      setSetupIdle();
      showSetupStatus(`Error: ${err.message}`, 'error');
    }
  }

  async function parseTextAndSave(text) {
    setSetupSaving();
    try {
      const res = await fetch(BACKEND + '/parse-profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await persistProfile(data.parsedProfile);
    } catch (err) {
      setSetupIdle();
      showSetupStatus(`Error: ${err.message}`, 'error');
    }
  }

  async function persistProfile(parsedProfile) {
    chrome.storage.local.set({ userProfile: parsedProfile, setupComplete: true }, () => {
      userProfile = parsedProfile;
      $('setupSkipBtn').classList.remove('hidden');
      showSetupStatus('Profile saved!', 'success');
      setTimeout(() => {
        hideSetup();
        renderProfileTab('profileContent');
        renderProfileTab('profileFormContent');
      }, 800);
    });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  $('setupSkipBtn').addEventListener('click', () => hideSetup());

  // ── Profile system ──

  function renderProfileTab(containerId) {
    const container = $(containerId);
    if (!container) return;
    if (!userProfile) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:#7878a0">No profile saved yet.<br>Click the gear icon to set up.</div>';
      return;
    }
    const sections = parseProfileSections(userProfile);
    container.innerHTML = '';
    sections.forEach(section => {
      const sDiv = document.createElement('div');
      sDiv.className = 'profile-section';
      sDiv.innerHTML = `<div class="profile-section-title">${section.title}</div>`;
      section.items.forEach(item => {
        if (!item.value) return;
        const itemEl = document.createElement('div');
        itemEl.className = 'profile-item';
        itemEl.innerHTML = `
          <div class="profile-item-label">${item.label}</div>
          <div class="profile-item-value">${escapeHtml(item.value)}</div>
          <div class="profile-item-copied">Copied!</div>
        `;
        itemEl.addEventListener('click', () => {
          navigator.clipboard.writeText(item.value).catch(() => {});
          const copied = itemEl.querySelector('.profile-item-copied');
          copied.classList.add('show');
          setTimeout(() => copied.classList.remove('show'), 1500);
        });
        sDiv.appendChild(itemEl);
      });
      container.appendChild(sDiv);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseProfileSections(profileText) {
    const extract = (patterns, text) => {
      for (const p of patterns) {
        const m = text.match(p);
        if (m) return (m[1] || m[0] || '').trim();
      }
      return '';
    };
    const t = profileText;
    return [
      { title: 'Contact', items: [
        { label: 'Name',     value: extract([/^([A-Z][a-z]+ [A-Z][a-z]+)/m, /Name[:\s]+([^\n]+)/i], t) },
        { label: 'Email',    value: extract([/[\w.+-]+@[\w-]+\.[a-z]{2,}/i], t) },
        { label: 'Phone',    value: extract([/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/], t) },
        { label: 'LinkedIn', value: extract([/(linkedin\.com\/in\/[\w-]+)/i], t) },
        { label: 'GitHub',   value: extract([/(github\.com\/[\w-]+)/i], t) },
      ]},
      { title: 'Experience', items: [
        { label: 'Current Title',      value: extract([/title[:\s]+([^\n]+)/i, /role[:\s]+([^\n]+)/i], t) },
        { label: 'Years of Experience', value: extract([/(\d+)\+?\s*years?\s*(of)?\s*experience/i], t) },
      ]},
      { title: 'Education', items: [
        { label: 'Degree',     value: extract([/(B\.?S\.?|M\.?S\.?|Ph\.?D\.?|Bachelor|Master)[^\n,]*/i], t) },
        { label: 'University', value: extract([/University of [^\n,]+|[^\n,]+ University/i], t) },
        { label: 'GPA',        value: extract([/GPA[:\s]*([\d.]+)/i], t) },
      ]},
      { title: 'Technical Skills', items: [
        { label: 'Skills', value: (extract([/skills?[:\s]+([^\n]{20,})/i, /technologies[:\s]+([^\n]+)/i], t) || '').slice(0, 200) },
      ]},
    ];
  }

  // ── Edit profile buttons ──

  $('editProfileBtn').addEventListener('click', () => {
    switchSetupTab('upload');
    showSetup();
  });

  $('editProfileFormBtn').addEventListener('click', () => {
    switchSetupTab('upload');
    showSetup();
  });

  // ── Time saved tracker ──

  function updateTimeSaved(minutesAdded) {
    chrome.storage.local.get(['jhos_time_saved'], result => {
      const total = (result.jhos_time_saved || 0) + minutesAdded;
      if (minutesAdded > 0) {
        chrome.storage.local.set({ jhos_time_saved: total });
      }
      timeSavedMinutes = total;
      const hours = Math.floor(total / 60);
      const mins  = total % 60;
      const text  = hours > 0
        ? `You've saved ${hours}h ${mins}m with JobHuntOS`
        : `You've saved ${total} minutes with JobHuntOS`;
      if ($('timeSavedText')) $('timeSavedText').textContent = text;
      if ($('timeSavedTextForm')) $('timeSavedTextForm').textContent = text;
    });
  }

  chrome.storage.local.get(['jhos_time_saved'], r => {
    timeSavedMinutes = r.jhos_time_saved || 0;
    updateTimeSaved(0);
  });

  // ── Helpers ──

  function showListingState(el) {
    const welcomeState = $('welcomeState');
    const loadingState = $('loadingState');
    const errorState   = $('errorState');
    const resultState  = $('resultState');
    [welcomeState, loadingState, errorState, resultState].forEach(s => s && s.classList.add('hidden'));
    if (el) el.classList.remove('hidden');
  }

  function truncateUrl(url, len = 42) {
    if (!url) return '—';
    try {
      const { hostname, pathname } = new URL(url);
      const short = hostname + pathname;
      return short.length > len ? short.slice(0, len) + '…' : short;
    } catch {
      return url.slice(0, len);
    }
  }

  function setUrlBar(url, showBadge = false) {
    const urlText = $('urlText');
    if (urlText) urlText.textContent = truncateUrl(url);
    const badge = $('urlBadge');
    if (badge) {
      if (showBadge) badge.classList.remove('hidden');
      else           badge.classList.add('hidden');
    }
  }

  function clearUrlBadge() {
    const badge = $('urlBadge');
    if (badge) badge.classList.add('hidden');
  }

  function copyText(text, btn, label = 'Copy') {
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '✓ Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = label; btn.classList.remove('copied'); }, 2000);
    }).catch(() => {
      btn.textContent = '✓ Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = label; btn.classList.remove('copied'); }, 2000);
    });
  }

  function scoreColor(score) {
    if (score >= 80) return 'var(--green)';
    if (score >= 60) return 'var(--amber)';
    return 'var(--red)';
  }

  function animateRing(ringEl, score, circumference = 163.4) {
    const offset = circumference - (score / 100) * circumference;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ringEl.style.strokeDashoffset = offset;
    }));
  }

  function detectAiWords(text) {
    return AI_BUZZWORDS.filter(w => text.toLowerCase().includes(w.toLowerCase()));
  }

  function highlightAiWords(text) {
    let result = text;
    AI_BUZZWORDS.forEach(word => {
      const re = new RegExp(`\\b(${word})\\b`, 'gi');
      result = result.replace(re, `<span class="ai-word">$1</span>`);
    });
    return result;
  }

  // ── ATS rendering ──

  function renderAts(ats) {
    if (!ats) return;

    const overall      = ats.overall ?? 0;
    const overallBadge = $('atsOverallBadge');
    overallBadge.innerHTML = `${overall}`;
    overallBadge.style.background = `${scoreColor(overall)}33`;
    overallBadge.style.color      = scoreColor(overall);

    const circ  = 94.2;
    const kRing = $('atsKeywordRing');
    $('atsKeywordNum').textContent = ats.keyword ?? '—';
    animateRing(kRing, ats.keyword ?? 0, circ);
    if (kRing) kRing.style.stroke = scoreColor(ats.keyword ?? 0);

    const fRing = $('atsFormatRing');
    $('atsFormatNum').textContent = ats.format ?? '—';
    animateRing(fRing, ats.format ?? 0, circ);
    if (fRing) fRing.style.stroke = scoreColor(ats.format ?? 0);

    const hRing = $('atsHumanRing');
    $('atsHumanNum').textContent = ats.human ?? '—';
    animateRing(hRing, ats.human ?? 0, circ);
    if (hRing) hRing.style.stroke = scoreColor(ats.human ?? 0);

    const foundEl = $('atsKeywordsFound');
    foundEl.innerHTML = '';
    (ats.breakdown?.keywordsFound || []).forEach(kw => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-green';
      tag.textContent = kw;
      foundEl.appendChild(tag);
    });

    const missingEl = $('atsKeywordsMissing');
    missingEl.innerHTML = '';
    (ats.breakdown?.keywordsMissing || []).forEach(kw => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-red';
      tag.textContent = kw;
      tag.title = `Add "${kw}" to your resume`;
      missingEl.appendChild(tag);
    });

    const sugEl = $('atsSuggestions');
    sugEl.innerHTML = '';
    (ats.breakdown?.suggestions || []).forEach(s => {
      const li = document.createElement('li');
      li.className = 'ats-suggestion-item';
      li.innerHTML = `<span class="suggestion-icon">💡</span><span>${escapeHtml(s)}</span>`;
      sugEl.appendChild(li);
    });
  }

  function updateHumanRing(score) {
    const hRing = $('atsHumanRing');
    if ($('atsHumanNum')) $('atsHumanNum').textContent = score;
    if (hRing) {
      hRing.style.stroke = scoreColor(score);
      animateRing(hRing, score, 94.2);
    }
  }

  // ── ATS tab population ──

  function populateAtsTab(atsScore) {
    const placeholder = $('atsTabPlaceholder');
    const fullPanel   = $('atsTabFull');
    if (!atsScore || !fullPanel) return;

    if (placeholder) placeholder.classList.add('hidden');
    fullPanel.classList.remove('hidden');

    const overall = atsScore.overall ?? 0;
    const color   = overall >= 80 ? '#00d4aa' : overall >= 60 ? '#f59e0b' : '#ef4444';

    fullPanel.innerHTML = `
      <div style="text-align:center;padding:20px 0 16px">
        <div style="font-size:48px;font-weight:900;color:${color}">${overall}</div>
        <div style="font-size:12px;color:#7878a0;margin-top:4px">Overall ATS Score</div>
      </div>
      <div style="display:flex;justify-content:space-around;padding:0 0 20px">
        ${renderMiniScore('Keywords', atsScore.keyword ?? 0)}
        ${renderMiniScore('Format', atsScore.format ?? 0)}
        ${renderMiniScore('Human', atsScore.human ?? 0)}
      </div>
      ${renderAtsSection('Keywords Found', atsScore.breakdown?.keywordsFound || [], 'tag-green')}
      ${renderAtsSection('Keywords Missing', atsScore.breakdown?.keywordsMissing || [], 'tag-red')}
      ${renderAtsSuggestions(atsScore.breakdown?.suggestions || [])}
    `;
  }

  function renderMiniScore(label, score) {
    const color = score >= 80 ? '#00d4aa' : score >= 60 ? '#f59e0b' : '#ef4444';
    return `
      <div style="text-align:center">
        <div style="font-size:24px;font-weight:800;color:${color}">${score}</div>
        <div style="font-size:10px;color:#7878a0;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
      </div>
    `;
  }

  function renderAtsSection(title, items, tagClass) {
    if (!items.length) return '';
    const tags = items.map(k => `<span class="tag ${tagClass}" style="margin-bottom:4px">${escapeHtml(k)}</span>`).join('');
    return `
      <div style="margin-bottom:16px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#7878a0;margin-bottom:8px">${title}</div>
        <div class="tags-wrap">${tags}</div>
      </div>
    `;
  }

  function renderAtsSuggestions(suggestions) {
    if (!suggestions.length) return '';
    const items = suggestions.map(s => `
      <li class="ats-suggestion-item"><span class="suggestion-icon">💡</span><span>${escapeHtml(s)}</span></li>
    `).join('');
    return `
      <div style="margin-bottom:16px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#7878a0;margin-bottom:8px">Suggestions</div>
        <ul class="ats-suggestions">${items}</ul>
      </div>
    `;
  }

  // ── ATS collapsible toggle ──

  function syncAtsCollapse() {
    const body    = $('atsBody');
    const chevron = $('atsChevron');
    if (!body || !chevron) return;
    if (atsCollapsed) {
      body.classList.add('collapsed');
      chevron.classList.remove('open');
    } else {
      body.classList.remove('collapsed');
      chevron.classList.add('open');
    }
  }

  const atsToggle = $('atsToggle');
  if (atsToggle) {
    atsToggle.addEventListener('click', () => {
      atsCollapsed = !atsCollapsed;
      syncAtsCollapse();
    });
  }

  const atsChevron = $('atsChevron');
  if (atsChevron) atsChevron.classList.add('open');

  // ── Render bullets ──

  function renderBullets(bullets) {
    const list = $('bulletsList');
    if (!list) return;
    list.innerHTML = '';
    const badge = $('bulletsBadge');
    if (badge) badge.textContent = bullets.length;

    bullets.forEach((bullet) => {
      const aiWords = detectAiWords(bullet);
      const li  = document.createElement('li');
      li.className = 'bullet-item';

      const dot = document.createElement('div');
      dot.className = 'bullet-dot';

      const span = document.createElement('span');
      span.className = 'bullet-text';
      if (aiWords.length > 0) {
        span.innerHTML = highlightAiWords(bullet);
      } else {
        span.textContent = bullet;
      }

      const btnWrap = document.createElement('div');
      btnWrap.style.display        = 'flex';
      btnWrap.style.flexDirection  = 'column';
      btnWrap.style.gap            = '4px';
      btnWrap.style.alignItems     = 'flex-end';

      const btn = document.createElement('button');
      btn.className = 'btn-copy';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => copyText(bullet, btn, 'Copy'));
      btnWrap.appendChild(btn);

      if (aiWords.length > 0) {
        const badge = document.createElement('span');
        badge.className = 'bullet-ai-badge';
        badge.textContent = 'AI words';
        badge.title = `Contains: ${aiWords.join(', ')}`;
        btnWrap.appendChild(badge);
      }

      li.append(dot, span, btnWrap);
      list.appendChild(li);
    });
  }

  // ── Save button state machine ──

  function setSaveIdle() {
    const btn = $('saveBtn');
    if (!btn) return;
    btn.disabled  = false;
    btn.className = 'btn-save';
    $('saveBtnInner').innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      Save to Notion`;
  }

  function setSavingState() {
    const btn = $('saveBtn');
    if (!btn) return;
    btn.disabled  = true;
    btn.className = 'btn-save btn-save--saving';
    $('saveBtnInner').innerHTML = `<span class="save-spinner"></span> Saving…`;
  }

  function setSavedState(notionUrl) {
    const btn = $('saveBtn');
    if (!btn) return;
    btn.className = 'btn-save btn-save--saved';
    $('saveBtnInner').innerHTML = `✓ Saved to Notion`;
    if (notionUrl) {
      btn.disabled = false;
      btn.title    = 'Open in Notion';
      btn.onclick  = () => window.open(notionUrl, '_blank');
    } else {
      btn.disabled = true;
    }
  }

  function setSaveError() {
    const btn = $('saveBtn');
    if (!btn) return;
    btn.disabled  = false;
    btn.className = 'btn-save btn-save--error';
    $('saveBtnInner').innerHTML = `✕ Save failed — try again`;
  }

  // ── Humanize button state machine ──

  function setHumanizeIdle() {
    const btn = $('humanizeBtn');
    if (!btn) return;
    btn.disabled  = false;
    btn.className = 'btn-humanize';
    $('humanizeBtnInner').textContent = '✦ Humanize My Bullets';
  }

  function setHumanizingState() {
    const btn = $('humanizeBtn');
    if (!btn) return;
    btn.disabled  = true;
    btn.className = 'btn-humanize';
    $('humanizeBtnInner').innerHTML = `<span class="save-spinner"></span> Humanizing…`;
  }

  function setHumanizeDone() {
    const btn = $('humanizeBtn');
    if (!btn) return;
    btn.disabled  = false;
    btn.className = 'btn-humanize btn-humanize--done';
    $('humanizeBtnInner').textContent = '✓ Humanized — Re-humanize?';
  }

  // ── Reset to welcome ──

  function resetToWelcome(msg) {
    lastAnalysis   = null;
    savedUrl       = null;
    savedPageId    = null;
    autofillActive = false;
    const resumeSection = $('resumeSection');
    if (resumeSection) resumeSection.classList.add('hidden');
    const autofillBtn = $('autofillBtn');
    if (autofillBtn) autofillBtn.classList.add('hidden');
    const autofillSummary = $('autofillSummary');
    if (autofillSummary) autofillSummary.classList.add('hidden');
    const applySection = $('applySection');
    if (applySection) applySection.classList.add('hidden');
    const welcomeSub = $('welcomeSub');
    if (welcomeSub) welcomeSub.textContent = msg || 'Ready to analyze — click Analyze This Job';
    showListingState($('welcomeState'));
  }

  function showError(msg) {
    const errorMsg = $('errorMsg');
    if (errorMsg) errorMsg.textContent = msg || 'Something went wrong. Make sure the backend is running.';
    showListingState($('errorState'));
  }

  // ── API: Analyze (SSE streaming) ──

  async function analyze(payload) {
    showListingState($('loadingState'));
    clearUrlBadge();
    currentUrl    = payload.url;
    hasAnalyzed   = true;
    autoReanalyze = true;

    try {
      const res = await fetch(BACKEND_ANALYZE_STREAM, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          url:         payload.url     || '',
          rawText:     payload.rawText || '',
          userProfile: userProfile     || '',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let msg;
          try { msg = JSON.parse(line.slice(6)); } catch { continue; }

          if (msg.type === 'scraping_done') {
            const lt = $('loadingText');
            if (lt) lt.textContent = 'Scoring your fit…';
          }

          if (msg.type === 'tier1') {
            const tier1Data = msg.data;
            if (typeof tier1Data.fitScore !== 'number' || tier1Data.fitScore <= 0) {
              throw new Error('Analysis returned an invalid fit score. The page may not be a job posting.');
            }
            renderTier1(tier1Data);
            const lt = $('loadingText');
            if (lt) lt.textContent = 'Loading ATS analysis…';
          }

          if (msg.type === 'tier2') {
            renderTier2(msg.data);
          }

          if (msg.type === 'done') {
            showListingState($('resultState'));
            updateTimeSaved(5);
          }

          if (msg.type === 'error') {
            throw new Error(msg.message);
          }
        }
      }
    } catch (err) {
      showError(err.message);
    }
  }

  function renderTier1(data) {
    lastAnalysis = { ...data };
    savedUrl     = null;
    savedPageId  = null;
    const resumeSection = $('resumeSection');
    if (resumeSection) resumeSection.classList.add('hidden');
    setSaveIdle();
    setHumanizeIdle();
    clearUrlBadge();

    if ($('jobRole'))      $('jobRole').textContent    = data.role    || 'Unknown Role';
    if ($('jobCompany'))   $('jobCompany').textContent = data.company || 'Unknown Company';
    if ($('scoreNum'))     $('scoreNum').textContent   = data.fitScore ?? '—';
    if ($('fitReasoning')) $('fitReasoning').textContent = data.fitReasoning || '';

    const mainRing = $('ringFill');
    if (mainRing) {
      mainRing.style.stroke = scoreColor(data.fitScore ?? 0);
      if (typeof data.fitScore === 'number') animateRing(mainRing, data.fitScore);
    }

    renderBullets(data.resumeBullets || []);

    const gapEl = $('skillsGapTags');
    if (gapEl) {
      gapEl.innerHTML = '';
      (data.skillsGap || []).forEach((skill) => {
        const tag = document.createElement('span');
        tag.className = 'tag tag-red';
        tag.textContent = skill;
        gapEl.appendChild(tag);
      });
    }

    const kwEl = $('keywordTags');
    if (kwEl) {
      kwEl.innerHTML = '';
      (data.topKeywords || []).forEach((kw) => {
        const tag = document.createElement('span');
        tag.className = 'tag tag-blue';
        tag.textContent = kw;
        kwEl.appendChild(tag);
      });
    }

    autofillActive = false;
    setAutofillIdle();
    showAutofillBtn();
    const autofillSummary = $('autofillSummary');
    if (autofillSummary) autofillSummary.classList.add('hidden');
    showApplySection();
    setApplyIdle();

    // Show skeletons for tier-2 content
    const atsSkeleton = $('atsSkeleton');
    const atsRealContent = $('atsRealContent');
    const atsOverallBadge = $('atsOverallBadge');
    if (atsSkeleton) atsSkeleton.classList.remove('hidden');
    if (atsRealContent) atsRealContent.classList.add('hidden');
    if (atsOverallBadge) {
      atsOverallBadge.innerHTML = '<span class="tier2-badge-spinner"></span>';
      atsOverallBadge.style.background = '';
      atsOverallBadge.style.color = '';
    }

    const outreachSkeleton = $('outreachSkeleton');
    const outreachText = $('outreachText');
    const copyOutreachBtn = $('copyOutreachBtn');
    if (outreachSkeleton) outreachSkeleton.classList.remove('hidden');
    if (outreachText) { outreachText.classList.add('hidden'); outreachText.textContent = ''; }
    if (copyOutreachBtn) copyOutreachBtn.classList.add('hidden');

    showListingState($('resultState'));

    // Also show the analyze prompt in form mode if no analysis was done
    if (currentMode === 'form') {
      const analyzePromptCard = $('analyzePromptCard');
      if (analyzePromptCard) analyzePromptCard.classList.add('hidden');
    }

    // If in form mode, update the fit badge
    if (currentMode === 'form') {
      const formFitBadge = $('formFitBadge');
      if (formFitBadge && typeof data.fitScore === 'number') {
        formFitBadge.textContent = `${data.fitScore}% Fit`;
        formFitBadge.classList.remove('hidden');
      }
    }
  }

  function renderTier2(data) {
    if (!lastAnalysis) return;
    Object.assign(lastAnalysis, data);

    if (data.outreachMessage) {
      const outreachSkeleton = $('outreachSkeleton');
      const outreachText     = $('outreachText');
      const copyAllBtn       = $('copyOutreachBtn');
      if (outreachSkeleton) outreachSkeleton.classList.add('hidden');
      if (outreachText) {
        outreachText.textContent = data.outreachMessage;
        outreachText.classList.remove('hidden');
      }
      if (copyAllBtn) {
        copyAllBtn.classList.remove('hidden');
        copyAllBtn.onclick = () => copyText(data.outreachMessage, copyAllBtn, '📋 Copy All');
      }
    }

    if (data.atsScore) {
      const atsSkeleton    = $('atsSkeleton');
      const atsRealContent = $('atsRealContent');
      if (atsSkeleton)    atsSkeleton.classList.add('hidden');
      if (atsRealContent) atsRealContent.classList.remove('hidden');
      renderAts(data.atsScore);
      populateAtsTab(data.atsScore);

      // If in form mode and keywords tab is active, update it
      if (currentMode === 'form') {
        renderKeywordsTab(lastAnalysis);
      }
    }
  }

  // ── API: Save ──

  async function saveToNotion() {
    if (!lastAnalysis) return;
    setSavingState();
    try {
      const res  = await fetch(BACKEND_SAVE, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...lastAnalysis, url: pagePayload?.url || '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      savedUrl    = data.notionUrl;
      savedPageId = data.notionPageId || null;
      setSavedState(savedUrl);
      showResumeSection();
    } catch (err) {
      console.error('[JobHuntOS] Save failed:', err.message);
      setSaveError();
    }
  }

  // ── API: Humanize ──

  async function humanize() {
    if (!lastAnalysis) return;
    setHumanizingState();

    try {
      const res = await fetch(BACKEND_HUMANIZE, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          bullets:         lastAnalysis.resumeBullets  || [],
          outreachMessage: lastAnalysis.outreachMessage || '',
          jobDescription:  pagePayload?.rawText || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      if (data.humanizedBullets?.length) {
        lastAnalysis.resumeBullets = data.humanizedBullets;
        renderBullets(data.humanizedBullets);
      }

      if (data.humanizedOutreach) {
        lastAnalysis.outreachMessage = data.humanizedOutreach;
        const outreachEl = $('outreachText');
        if (outreachEl) outreachEl.textContent = data.humanizedOutreach;
        const copyAllBtn = $('copyOutreachBtn');
        if (copyAllBtn) copyAllBtn.onclick = () => copyText(data.humanizedOutreach, copyAllBtn, '📋 Copy All');
      }

      if (typeof data.newHumanScore === 'number') {
        updateHumanRing(data.newHumanScore);
        if (lastAnalysis.atsScore) lastAnalysis.atsScore.human = data.newHumanScore;
      }

      lastAnalysis.humanized = true;
      setHumanizeDone();
    } catch (err) {
      console.error('[JobHuntOS] Humanize failed:', err.message);
      setHumanizeIdle();
    }
  }

  // ── Resume section ──

  function showResumeSection() {
    const resumeSection = $('resumeSection');
    if (resumeSection) resumeSection.classList.remove('hidden');
    const resumeResult = $('resumeResult');
    if (resumeResult) resumeResult.classList.add('hidden');
    setResumeIdle();
  }

  function setResumeIdle() {
    const btn = $('resumeBtn');
    if (!btn) return;
    btn.disabled  = false;
    btn.className = 'btn-resume';
    $('resumeBtnInner').innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      Generate Tailored Resume`;
  }

  function setResumeLoading() {
    const btn = $('resumeBtn');
    if (!btn) return;
    btn.disabled  = true;
    btn.className = 'btn-resume btn-resume--loading';
    $('resumeBtnInner').innerHTML = `<span class="save-spinner"></span> Generating your resume…`;
  }

  async function generateResume() {
    if (!savedPageId || !lastAnalysis) return;
    setResumeLoading();

    try {
      const res = await fetch(BACKEND_GENERATE_RESUME, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionPageId: savedPageId,
          analysis:     lastAnalysis,
          jobTitle:     lastAnalysis.role    || '',
          company:      lastAnalysis.company || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const resultEl = $('resumeResult');
      if (resultEl) resultEl.classList.remove('hidden');
      const resumeNote = $('resumeNote');
      if (resumeNote) resumeNote.textContent = `Resume tailored for ${lastAnalysis.company || 'Company'} — ${lastAnalysis.role || 'Role'}`;
      const resumeNotionLink = $('resumeNotionLink');
      if (resumeNotionLink) resumeNotionLink.href = data.notionResumeUrl || '#';

      const dlBtn = $('resumeDownloadBtn');
      if (dlBtn) {
        dlBtn.onclick = () => {
          const bytes = atob(data.docxBase64);
          const arr   = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
          const blob  = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          const url   = URL.createObjectURL(blob);
          const a     = document.createElement('a');
          a.href      = url;
          a.download  = data.filename || 'Resume.docx';
          a.click();
          URL.revokeObjectURL(url);
        };
      }

      const btn = $('resumeBtn');
      if (btn) {
        btn.disabled  = false;
        btn.className = 'btn-resume';
        $('resumeBtnInner').innerHTML = `↻ Re-generate Resume`;
      }

    } catch (err) {
      console.error('[JobHuntOS] Resume generation failed:', err.message);
      setResumeIdle();
      const resumeNote   = $('resumeNote');
      const resumeResult = $('resumeResult');
      if (resumeNote)   resumeNote.textContent = `Error: ${err.message}`;
      if (resumeResult) resumeResult.classList.remove('hidden');
    }
  }

  // ── Autofill (listing mode) ──

  function showAutofillBtn() {
    const autofillBtn = $('autofillBtn');
    if (autofillBtn) autofillBtn.classList.remove('hidden');
  }

  function setAutofillIdle() {
    const btn = $('autofillBtn');
    if (!btn) return;
    btn.disabled   = false;
    btn.textContent = '⚡ Autofill Application';
    btn.className  = 'btn-autofill';
  }

  function setAutofillLoading() {
    const btn = $('autofillBtn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="save-spinner"></span> Generating fill values…';
    btn.className = 'btn-autofill btn-autofill--loading';
  }

  function setAutofillDone(count, platform) {
    autofillActive = true;
    const btn = $('autofillBtn');
    if (btn) {
      btn.disabled    = false;
      btn.textContent = `✓ ${count} field${count !== 1 ? 's' : ''} filled — Undo`;
      btn.className   = 'btn-autofill btn-autofill--done';
    }

    const summary = $('autofillSummary');
    if (summary) {
      summary.classList.remove('hidden');
      summary.innerHTML = `
        <span class="autofill-count">⚡ ${count} fields filled on this page</span>
        <span class="autofill-platform">Platform: ${platform}</span>
        <span class="autofill-warning">⚠ Review all fields before submitting</span>
      `;
    }
  }

  function setAutofillError(msg) {
    const btn = $('autofillBtn');
    if (btn) {
      btn.disabled    = false;
      btn.textContent = '⚡ Autofill Application';
      btn.className   = 'btn-autofill btn-autofill--error';
    }

    const summary = $('autofillSummary');
    if (summary) {
      summary.classList.remove('hidden');
      summary.innerHTML = `<span class="autofill-warning">✕ ${escapeHtml(msg)}</span>`;
    }
  }

  async function runAutofill() {
    if (!lastAnalysis) return;

    if (autofillActive) {
      chrome.tabs.query({}, (tabs) => {
        const target = tabs
          .filter(t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'))
          .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
        if (target) {
          chrome.tabs.sendMessage(target.id, { type: 'UNDO_AUTOFILL' }, () => {
            void chrome.runtime.lastError;
          });
        }
        autofillActive = false;
        setAutofillIdle();
        const autofillSummary = $('autofillSummary');
        if (autofillSummary) autofillSummary.classList.add('hidden');
        chrome.storage.local.remove(JHOS_STORAGE_KEY);
      });
      return;
    }

    setAutofillLoading();
    const profile = userProfile || '';

    chrome.tabs.query({}, async (tabs) => {
      const target = tabs
        .filter(t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'))
        .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];

      if (!target) {
        setAutofillError('No open tab found. Navigate to the application form first.');
        return;
      }

      const trySameTab = () => new Promise((resolve) => {
        chrome.tabs.sendMessage(target.id, {
          type:         'START_AUTOFILL',
          profileData:  profile,
          analysisData: lastAnalysis,
        }, (response) => {
          if (chrome.runtime.lastError) { resolve(null); return; }
          resolve(response);
        });
      });

      let response = await trySameTab();

      if (!response) {
        chrome.runtime.sendMessage({
          type: 'QUEUE_AUTOFILL',
          payload: {
            autofillValues: null,
            profileData:    profile,
            analysisData:   lastAnalysis,
            triggeredAt:    Date.now(),
          },
        }, () => void chrome.runtime.lastError);

        setAutofillDone('~', 'queued — switch to the application tab');
        return;
      }

      if (response.success) {
        setAutofillDone(response.filledCount, response.platform);
      } else {
        setAutofillError(response.error || 'Autofill failed.');
      }
    });
  }

  // ── Apply section ──

  function showApplySection() {
    const applySection = $('applySection');
    if (applySection) applySection.classList.remove('hidden');
  }

  function setApplyIdle() {
    const btn = $('applyBtn');
    if (!btn) return;
    btn.disabled    = false;
    btn.className   = 'btn-apply';
    btn.textContent = '🚀 Apply to This Job';
    const applyStatus = $('applyStatus');
    if (applyStatus) applyStatus.innerHTML = '';
  }

  function setApplyLoading(msg) {
    const btn = $('applyBtn');
    if (!btn) return;
    btn.disabled  = true;
    btn.innerHTML = `<span class="save-spinner"></span> ${msg}`;
    btn.className = 'btn-apply';
  }

  function setApplyDone() {
    const btn = $('applyBtn');
    if (!btn) return;
    btn.disabled    = false;
    btn.className   = 'btn-apply btn-apply--done';
    btn.textContent = '✓ Application ready — switch to form tab';
  }

  function setApplyError(msg) {
    const btn = $('applyBtn');
    if (!btn) return;
    btn.disabled    = false;
    btn.className   = 'btn-apply btn-apply--error';
    btn.textContent = '⚠ ' + msg;
  }

  async function handleApply() {
    if (!lastAnalysis) return;
    setApplyLoading('Generating autofill data…');

    try {
      const profile = userProfile || '';

      await new Promise(resolve =>
        chrome.storage.local.set({
          [JHOS_STORAGE_KEY]: {
            autofillValues: null,
            profileData:    profile,
            analysisData:   lastAnalysis,
            triggeredAt:    Date.now(),
            status:         'pending',
          }
        }, resolve)
      );

      setApplyLoading('Finding Apply button…');

      const clicked = await new Promise((resolve) => {
        window.parent.postMessage({ type: 'FIND_AND_CLICK_APPLY' }, '*');
        const handler = (ev) => {
          if (ev.data?.type === 'APPLY_CLICK_RESULT') {
            window.removeEventListener('message', handler);
            resolve(ev.data.clicked || false);
          }
        };
        window.addEventListener('message', handler);
        setTimeout(() => { window.removeEventListener('message', handler); resolve(false); }, 3000);
      });

      setApplyDone();
      const applyStatus = $('applyStatus');
      if (applyStatus) {
        applyStatus.innerHTML = clicked
          ? `<span style="color:var(--green)">✓ Apply button clicked — autofill queued for the form</span>`
          : `<span style="color:var(--amber)">⚠ Couldn't find Apply button — click it manually. Autofill is ready.</span>`;
      }

    } catch (err) {
      setApplyError('Failed: ' + err.message);
    }
  }

  // ════════════════════════════════════════
  // FORM MODE — Autofill
  // ════════════════════════════════════════

  function requestQuestionScan() {
    window.parent.postMessage({ type: 'SCAN_QUESTIONS' }, '*');
  }

  function renderQuestions(questions) {
    scannedQuestions = questions;
    const qCount = $('qCount');
    if (qCount) qCount.textContent = questions.length;
    const list = $('questionsList');
    if (!list) return;
    list.innerHTML = '';
    questions.forEach((q, i) => {
      const item = document.createElement('div');
      item.className = 'question-item';
      item.id = 'q-item-' + i;
      item.innerHTML = `
        <div class="q-status" id="q-status-${i}"></div>
        <div class="q-text">${escapeHtml(q.label.slice(0, 80))}${q.label.length > 80 ? '…' : ''}</div>
        <button class="q-ai-btn" data-qi="${i}">✨ AI</button>
      `;
      item.querySelector('.q-ai-btn').addEventListener('click', () => fillSingleQuestion(i));
      list.appendChild(item);
    });
  }

  function setQuestionStatus(index, status) {
    const el = $('q-status-' + index);
    if (!el) return;
    el.className = 'q-status ' + status;
    if (status === 'filled') el.textContent = '✓';
    if (status === 'failed') el.textContent = '✗';
    const textEl = el.nextElementSibling;
    if (status === 'filled' && textEl) textEl.classList.add('filled-text');
  }

  async function fillSingleQuestion(index) {
    const q = scannedQuestions[index];
    if (!q) return;
    setQuestionStatus(index, 'filling');

    try {
      const profile = userProfile || '';
      const res = await fetch(BACKEND + '/answer-questions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile:  profile,
          jobAnalysis:  lastAnalysis || {},
          questions:    [{ label: q.label, type: q.type, name: q.name, options: q.options }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const answers = data.answers || [];
      if (answers[0]) {
        window.parent.postMessage({ type: 'EXECUTE_AUTOFILL', autofillValues: { [index]: answers[0] }, analysisData: lastAnalysis }, '*');
      }
      setQuestionStatus(index, 'filled');
    } catch (err) {
      console.error('[JobHuntOS] Single question fill failed:', err);
      setQuestionStatus(index, 'failed');
    }
  }

  async function handleFormAutofill() {
    const btn = $('autofillPageBtn');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="save-spinner"></span> Generating answers…';

    const profile  = userProfile || '';
    const analysis = lastAnalysis || {};

    scannedQuestions.forEach((_, i) => setQuestionStatus(i, 'filling'));

    try {
      let questions = scannedQuestions;
      if (!questions.length) {
        requestQuestionScan();
        await new Promise(r => setTimeout(r, 1200));
        questions = scannedQuestions;
      }

      const res = await fetch(BACKEND + '/generate-autofill', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile:  profile,
          jobAnalysis:  analysis,
          formFields:   questions.map(q => ({ label: q.label, type: q.type, name: q.name || '', options: q.options || [] })),
        }),
      });
      const { autofillValues } = await res.json();

      window.parent.postMessage({ type: 'EXECUTE_AUTOFILL', autofillValues, analysisData: analysis }, '*');

      btn.disabled  = false;
      btn.innerHTML = '✓ Filling…';

    } catch (err) {
      btn.disabled  = false;
      btn.textContent = '⚡ Autofill This Page';
      console.error('[JobHuntOS] Form autofill failed:', err);
      scannedQuestions.forEach((_, i) => setQuestionStatus(i, 'failed'));
    }
  }

  // ── Form mode: keywords tab ──

  function renderKeywordsTab(analysisData) {
    if (!analysisData) return;
    const atsScore = analysisData.atsScore;
    const pct      = atsScore?.keyword ?? 0;

    const fill          = $('kwGaugeFill');
    const circumference = 213.6;
    const offset        = circumference - (pct / 100) * circumference;
    if (fill) {
      requestAnimationFrame(() => {
        fill.style.strokeDashoffset = offset;
        fill.style.stroke = pct >= 70 ? '#00d4aa' : pct >= 40 ? '#f59e0b' : '#ef4444';
      });
    }

    const kwGaugePct   = $('kwGaugePct');
    const kwGaugeLabel = $('kwGaugeLabel');
    const kwMatchStatus = $('kwMatchStatus');

    if (kwGaugePct)    kwGaugePct.textContent   = pct;
    if (kwGaugeLabel)  kwGaugeLabel.textContent  = pct >= 70 ? 'Strong' : pct >= 40 ? 'Getting There' : 'Needs Work';
    if (kwMatchStatus) kwMatchStatus.textContent = `Keyword Match — ${pct >= 70 ? 'Strong Match' : pct >= 40 ? 'Getting There' : 'Needs Work'}`;

    const foundEl   = $('kwFoundList');
    const missingEl = $('kwMissingList');
    if (foundEl)   foundEl.innerHTML   = '';
    if (missingEl) missingEl.innerHTML = '';

    const foundKws   = atsScore?.breakdown?.keywordsFound  || analysisData.topKeywords || [];
    const missingKws = atsScore?.breakdown?.keywordsMissing || analysisData.skillsGap   || [];

    foundKws.forEach(kw => {
      if (!foundEl) return;
      const tag = document.createElement('span');
      tag.className   = 'kw-tag kw-tag-found';
      tag.textContent = kw;
      foundEl.appendChild(tag);
    });

    missingKws.forEach(kw => {
      if (!missingEl) return;
      const tag = document.createElement('span');
      tag.className   = 'kw-tag kw-tag-missing';
      tag.textContent = kw;
      missingEl.appendChild(tag);
    });
  }

  // ── Form mode: cover letter ──

  async function generateCoverLetter() {
    const btn = $('genCoverBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }

    try {
      const res = await fetch(BACKEND + '/answer-questions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile: userProfile || '',
          jobAnalysis: lastAnalysis || {},
          questions:   [{ label: 'Cover Letter', type: 'textarea', name: 'cover_letter', options: [] }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const coverText = data.answers?.[0] || '';
      if (coverText) {
        const preview = $('coverLetterPreview');
        const clStatus = $('clStatus');
        const copyCoverBtn = $('copyCoverBtn');
        if (preview) { preview.textContent = coverText; preview.classList.remove('hidden'); }
        if (clStatus) { clStatus.textContent = 'Generated'; clStatus.classList.add('detected'); }
        if (copyCoverBtn) {
          copyCoverBtn.classList.remove('hidden');
          copyCoverBtn.onclick = () => copyText(coverText, copyCoverBtn, 'Copy');
        }
      }
    } catch (err) {
      console.error('[JobHuntOS] Cover letter generation failed:', err);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Generate Cover Letter'; }
    }
  }

  // ════════════════════════════════════════
  // EVENT LISTENERS
  // ════════════════════════════════════════

  $('closeBtn').addEventListener('click', () => {
    window.parent.postMessage({ type: 'CLOSE_SIDEBAR' }, '*');
  });

  $('analyzeBtn').addEventListener('click', () => {
    if (!pagePayload) {
      showError('Page data not ready yet. Please wait a moment and try again.');
      return;
    }
    if (!pagePayload.rawText || pagePayload.rawText.length < 200) {
      showError('Could not extract job description. Try scrolling to load the full job details first.');
      return;
    }
    clearUrlBadge();
    analyze(pagePayload);
  });

  $('retryBtn').addEventListener('click', () => {
    if (pagePayload) analyze(pagePayload);
    else window.parent.postMessage({ type: 'RETRY' }, '*');
  });

  $('reanalyzeBtn').addEventListener('click', () => {
    if (pagePayload) analyze(pagePayload);
  });

  $('newJobBtn').addEventListener('click', () => {
    resetToWelcome('Ready to analyze — click Analyze This Job');
  });

  $('saveBtn').addEventListener('click', () => {
    if (!$('saveBtn').disabled) saveToNotion();
  });

  $('humanizeBtn').addEventListener('click', () => {
    if (!$('humanizeBtn').disabled) humanize();
  });

  $('resumeBtn').addEventListener('click', () => {
    if (!$('resumeBtn').disabled) generateResume();
  });

  $('autofillBtn').addEventListener('click', () => {
    if (!$('autofillBtn').disabled) runAutofill();
  });

  $('applyBtn').addEventListener('click', () => {
    if (!$('applyBtn').disabled) handleApply();
  });

  // Form mode buttons
  $('autofillPageBtn').addEventListener('click', () => handleFormAutofill());

  $('undoBtn').addEventListener('click', () => {
    window.parent.postMessage({ type: 'UNDO_AUTOFILL_FORM' }, '*');
    const undoBar = $('undoBar');
    if (undoBar) undoBar.classList.add('hidden');
    const autofillPageBtn = $('autofillPageBtn');
    if (autofillPageBtn) { autofillPageBtn.disabled = false; autofillPageBtn.textContent = '⚡ Autofill This Page'; }
  });

  $('quickAnalyzeBtn').addEventListener('click', () => {
    // Switch to listing mode and trigger analyze
    setMode('listing');
    activateTab('analyze');
    if (pagePayload && pagePayload.rawText && pagePayload.rawText.length >= 200) {
      analyze(pagePayload);
    }
  });

  $('genCoverBtn').addEventListener('click', () => generateCoverLetter());

  $('tailorResumeBtn').addEventListener('click', () => {
    if (savedUrl) window.open(savedUrl, '_blank');
    else if (lastAnalysis) saveToNotion();
  });

  // ════════════════════════════════════════
  // MESSAGES FROM CONTENT.JS
  // ════════════════════════════════════════

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    const { type } = data;

    if (type === 'PAGE_DATA') {
      const { url, rawText, pageType, jobInfo } = data;
      pagePayload = { url, rawText };
      setUrlBar(url, false);

      // Update form mode job card
      if (jobInfo) {
        const formJobTitle   = $('formJobTitle');
        const formJobCompany = $('formJobCompany');
        if (formJobTitle)   formJobTitle.textContent   = jobInfo.title   || 'Application Form';
        if (formJobCompany) formJobCompany.textContent = jobInfo.company || '';
      }

      // If new page type differs from current mode, switch
      if (pageType && pageType !== currentMode) {
        setMode(pageType);
      }

      // Show analyze prompt in form mode if no analysis
      if (currentMode === 'form') {
        const analyzePromptCard = $('analyzePromptCard');
        if (analyzePromptCard) {
          if (!lastAnalysis) analyzePromptCard.classList.remove('hidden');
          else               analyzePromptCard.classList.add('hidden');
        }
        // Update fit badge if we have analysis
        if (lastAnalysis && typeof lastAnalysis.fitScore === 'number') {
          const formFitBadge = $('formFitBadge');
          if (formFitBadge) {
            formFitBadge.textContent = `${lastAnalysis.fitScore}% Fit`;
            formFitBadge.classList.remove('hidden');
          }
        }
      }
    }

    if (type === 'URL_CHANGED') {
      const { url, pageType, jobInfo } = data;
      if (url === currentUrl) return;
      setUrlBar(url, hasAnalyzed);

      if (hasAnalyzed) {
        const badge = $('urlBadge');
        if (badge) badge.classList.remove('hidden');
        if (autoReanalyze && currentMode === 'listing') {
          resetToWelcome('New job detected! Click Analyze This Job');
        }
      }

      // If page type changed, switch mode
      if (pageType && pageType !== currentMode) {
        setMode(pageType);
      }

      // Update job card in form mode
      if (jobInfo && currentMode === 'form') {
        const formJobTitle   = $('formJobTitle');
        const formJobCompany = $('formJobCompany');
        if (formJobTitle)   formJobTitle.textContent   = jobInfo.title   || 'Application Form';
        if (formJobCompany) formJobCompany.textContent = jobInfo.company || '';
      }
    }

    if (type === 'EXTRACTION_ERROR') {
      showError(data.message || 'Could not extract job description.');
    }

    if (type === 'QUESTIONS_SCANNED') {
      renderQuestions(data.questions || []);
    }

    if (type === 'FILL_PROGRESS') {
      setQuestionStatus(data.index, 'filled');
    }

    if (type === 'FILL_COMPLETE') {
      const count = data.filledCount || 0;
      const undoBar = $('undoBar');
      if (undoBar) undoBar.classList.remove('hidden');
      const filledCountText = $('filledCountText');
      if (filledCountText) filledCountText.textContent = `${count} fields filled ✓`;
      const autofillPageBtn = $('autofillPageBtn');
      if (autofillPageBtn) { autofillPageBtn.disabled = false; autofillPageBtn.textContent = '✓ Filled — Autofill Again?'; }
      updateTimeSaved(3);
    }

    if (type === 'FILL_ERROR') {
      setQuestionStatus(data.index, 'failed');
    }

    if (type === 'APPLY_CLICK_RESULT') {
      // handled inline in handleApply
    }
  });

  // ── Initialize ──
  // Start in listing mode, showing welcome state
  const app = document.getElementById('app');
  app.classList.add('mode-listing');
  showListingState($('welcomeState'));

})();
