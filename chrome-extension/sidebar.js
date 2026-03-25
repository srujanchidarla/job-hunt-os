(() => {
  const BACKEND_ANALYZE_STREAM  = 'http://localhost:3000/api/analyze-stream';
  const BACKEND_SAVE            = 'http://localhost:3000/api/save';
  const BACKEND_HUMANIZE        = 'http://localhost:3000/api/humanize';
  const BACKEND_GENERATE_RESUME = 'http://localhost:3000/api/generate-resume';

  // ── Profile ──
  let userProfile = null;

  const AI_BUZZWORDS = ['leverage', 'utilize', 'synergy', 'spearheaded', 'orchestrated',
    'deliverables', 'robust', 'innovative', 'cutting-edge', 'empower', 'transformative',
    'holistic', 'paradigm', 'ecosystem', 'streamline'];

  const $ = (id) => document.getElementById(id);

  const welcomeState = $('welcomeState');
  const loadingState = $('loadingState');
  const errorState   = $('errorState');
  const resultState  = $('resultState');

  // ── Setup overlay ──

  const setupOverlay = $('setupOverlay');

  function showSetup() { setupOverlay.classList.remove('hidden'); }
  function hideSetup() { setupOverlay.classList.add('hidden'); }

  // On load: check for existing profile
  chrome.storage.local.get(['setupComplete', 'userProfile'], (result) => {
    if (result.setupComplete && result.userProfile) {
      userProfile = result.userProfile;
    } else {
      showSetup();
    }
  });

  // Gear button opens setup
  $('gearBtn').addEventListener('click', () => {
    // Reset to upload tab each time
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
      // LinkedIn save is triggered by its own button; nudge them
      showSetupStatus('Click the blue "Extract from Current LinkedIn Page" button above.', 'info');
    }
  }

  async function parseFileAndSave(file) {
    setSetupSaving();
    try {
      const base64 = await fileToBase64(file);
      const ext    = file.name.split('.').pop().toLowerCase();
      const res = await fetch('http://localhost:3000/api/parse-profile', {
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
      const res = await fetch('http://localhost:3000/api/parse-profile', {
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
      showSetupStatus('Profile saved!', 'success');
      setTimeout(() => hideSetup(), 800);
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

  // ── Setup: back button ──

  chrome.storage.local.get(['setupComplete'], (result) => {
    if (result.setupComplete) $('setupSkipBtn').classList.remove('hidden');
  });

  $('setupSkipBtn').addEventListener('click', () => hideSetup());

  // ── App state ──
  let pagePayload    = null;
  let lastAnalysis   = null;
  let savedUrl       = null;
  let savedPageId    = null; // Notion page ID returned after save — needed for resume gen
  let currentUrl     = null;
  let hasAnalyzed    = false;
  let autoReanalyze  = false;
  let atsCollapsed   = false; // ATS section starts expanded

  // ── Helpers ──

  function showOnly(el) {
    [welcomeState, loadingState, errorState, resultState].forEach((s) => s.classList.add('hidden'));
    el.classList.remove('hidden');
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
    $('urlText').textContent = truncateUrl(url);
    const badge = $('urlBadge');
    if (showBadge) badge.classList.remove('hidden');
    else           badge.classList.add('hidden');
  }

  function clearUrlBadge() { $('urlBadge').classList.add('hidden'); }

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

    // Overall badge — replace spinner with score number
    const overall = ats.overall ?? 0;
    const overallBadge = $('atsOverallBadge');
    overallBadge.innerHTML = `${overall}`;
    overallBadge.style.background = `${scoreColor(overall)}33`;
    overallBadge.style.color = scoreColor(overall);

    // Mini rings (circumference for r=15 is 94.2)
    const circ = 94.2;

    const kRing = $('atsKeywordRing');
    $('atsKeywordNum').textContent = ats.keyword ?? '—';
    animateRing(kRing, ats.keyword ?? 0, circ);

    const fRing = $('atsFormatRing');
    $('atsFormatNum').textContent = ats.format ?? '—';
    animateRing(fRing, ats.format ?? 0, circ);

    const hRing = $('atsHumanRing');
    $('atsHumanNum').textContent = ats.human ?? '—';
    animateRing(hRing, ats.human ?? 0, circ);

    // Keywords found (green tags)
    const foundEl = $('atsKeywordsFound');
    foundEl.innerHTML = '';
    (ats.breakdown?.keywordsFound || []).forEach(kw => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-green';
      tag.textContent = kw;
      foundEl.appendChild(tag);
    });

    // Keywords missing (red tags with tooltip)
    const missingEl = $('atsKeywordsMissing');
    missingEl.innerHTML = '';
    (ats.breakdown?.keywordsMissing || []).forEach(kw => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-red';
      tag.textContent = kw;
      tag.title = `Add "${kw}" to your resume`;
      missingEl.appendChild(tag);
    });

    // Suggestions
    const sugEl = $('atsSuggestions');
    sugEl.innerHTML = '';
    (ats.breakdown?.suggestions || []).forEach(s => {
      const li = document.createElement('li');
      li.className = 'ats-suggestion-item';
      li.innerHTML = `<span class="suggestion-icon">💡</span><span>${s}</span>`;
      sugEl.appendChild(li);
    });
  }

  function updateHumanRing(score) {
    const hRing = $('atsHumanRing');
    $('atsHumanNum').textContent = score;
    hRing.style.stroke = scoreColor(score);
    animateRing(hRing, score, 94.2);
  }

  // ── ATS collapsible toggle ──

  function syncAtsCollapse() {
    const body    = $('atsBody');
    const chevron = $('atsChevron');
    if (atsCollapsed) {
      body.classList.add('collapsed');
      chevron.classList.remove('open');
    } else {
      body.classList.remove('collapsed');
      chevron.classList.add('open');
    }
  }

  $('atsToggle').addEventListener('click', () => {
    atsCollapsed = !atsCollapsed;
    syncAtsCollapse();
  });

  // Start expanded
  $('atsChevron').classList.add('open');

  // ── Render bullets with AI word detection ──

  function renderBullets(bullets) {
    const list = $('bulletsList');
    list.innerHTML = '';
    $('bulletsBadge').textContent = bullets.length;

    bullets.forEach((bullet) => {
      const aiWords = detectAiWords(bullet);
      const li   = document.createElement('li');
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
      btnWrap.style.display = 'flex';
      btnWrap.style.flexDirection = 'column';
      btnWrap.style.gap = '4px';
      btnWrap.style.alignItems = 'flex-end';

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
    btn.disabled = false;
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
    btn.disabled = true;
    btn.className = 'btn-save btn-save--saving';
    $('saveBtnInner').innerHTML = `<span class="save-spinner"></span> Saving…`;
  }

  function setSavedState(notionUrl) {
    const btn = $('saveBtn');
    btn.className = 'btn-save btn-save--saved';
    $('saveBtnInner').innerHTML = `✓ Saved to Notion`;
    if (notionUrl) {
      btn.disabled = false;
      btn.title = 'Open in Notion';
      btn.onclick = () => window.open(notionUrl, '_blank');
    } else {
      btn.disabled = true;
    }
  }

  function setSaveError() {
    const btn = $('saveBtn');
    btn.disabled = false;
    btn.className = 'btn-save btn-save--error';
    $('saveBtnInner').innerHTML = `✕ Save failed — try again`;
  }

  // ── Humanize button state machine ──

  function setHumanizeIdle() {
    const btn = $('humanizeBtn');
    btn.disabled = false;
    btn.className = 'btn-humanize';
    $('humanizeBtnInner').textContent = '✦ Humanize My Bullets';
  }

  function setHumanizingState() {
    const btn = $('humanizeBtn');
    btn.disabled = true;
    btn.className = 'btn-humanize';
    $('humanizeBtnInner').innerHTML = `<span class="save-spinner"></span> Humanizing…`;
  }

  function setHumanizeDone() {
    const btn = $('humanizeBtn');
    btn.disabled = false;
    btn.className = 'btn-humanize btn-humanize--done';
    $('humanizeBtnInner').textContent = '✓ Humanized — Re-humanize?';
  }

  // ── Reset to welcome ──

  function resetToWelcome(msg) {
    lastAnalysis = null;
    savedUrl     = null;
    savedPageId  = null;
    autofillActive = false;
    $('resumeSection').classList.add('hidden');
    $('autofillBtn').classList.add('hidden');
    $('autofillSummary').classList.add('hidden');
    $('applySection').classList.add('hidden');
    $('welcomeSub').textContent = msg || 'Ready to analyze — click Analyze This Job';
    showOnly(welcomeState);
  }

  function showError(msg) {
    $('errorMsg').textContent = msg || 'Something went wrong. Make sure the backend is running.';
    showOnly(errorState);
  }

  // ── API: Analyze (SSE streaming) ──

  async function analyze(payload) {
    showOnly(loadingState);
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
      let   tier1Data = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let msg;
          try { msg = JSON.parse(line.slice(6)); } catch { continue; }

          if (msg.type === 'scraping_done') {
            $('loadingText') && ($('loadingText').textContent = 'Scoring your fit…');
          }

          if (msg.type === 'tier1') {
            tier1Data = msg.data;
            if (typeof tier1Data.fitScore !== 'number' || tier1Data.fitScore <= 0) {
              throw new Error('Analysis returned an invalid fit score. The page may not be a job posting.');
            }
            renderTier1(tier1Data);
            $('loadingText') && ($('loadingText').textContent = 'Loading ATS analysis…');
          }

          if (msg.type === 'tier2') {
            renderTier2(msg.data);
          }

          if (msg.type === 'done') {
            showOnly(resultState);
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

  // Render tier 1 fields (fit score, bullets, gap, keywords) and show results
  // with placeholders for tier 2 data so the user sees content immediately.
  function renderTier1(data) {
    lastAnalysis = { ...data };
    savedUrl     = null;
    savedPageId  = null;
    $('resumeSection').classList.add('hidden');
    setSaveIdle();
    setHumanizeIdle();
    clearUrlBadge();

    $('jobRole').textContent      = data.role    || 'Unknown Role';
    $('jobCompany').textContent   = data.company || 'Unknown Company';
    $('scoreNum').textContent     = data.fitScore ?? '—';
    $('fitReasoning').textContent = data.fitReasoning || '';

    const mainRing = $('ringFill');
    mainRing.style.stroke = scoreColor(data.fitScore ?? 0);
    if (typeof data.fitScore === 'number') animateRing(mainRing, data.fitScore);

    renderBullets(data.resumeBullets || []);

    // Skills Gap
    const gapEl = $('skillsGapTags');
    gapEl.innerHTML = '';
    (data.skillsGap || []).forEach((skill) => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-red';
      tag.textContent = skill;
      gapEl.appendChild(tag);
    });

    // Keywords
    const kwEl = $('keywordTags');
    kwEl.innerHTML = '';
    (data.topKeywords || []).forEach((kw) => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-blue';
      tag.textContent = kw;
      kwEl.appendChild(tag);
    });

    // Reset autofill state
    autofillActive = false;
    setAutofillIdle();
    showAutofillBtn();
    $('autofillSummary').classList.add('hidden');
    showApplySection();
    setApplyIdle();

    // Show skeletons for tier-2 content
    // ATS: show skeleton, hide real content, put spinner in badge
    $('atsSkeleton').classList.remove('hidden');
    $('atsRealContent').classList.add('hidden');
    $('atsOverallBadge').innerHTML = '<span class="tier2-badge-spinner" id="atsBadgeSpinner"></span>';
    $('atsOverallBadge').style.background = '';
    $('atsOverallBadge').style.color = '';

    // Outreach: show skeleton, hide real card and copy button
    $('outreachSkeleton').classList.remove('hidden');
    $('outreachText').classList.add('hidden');
    $('outreachText').textContent = '';
    $('copyOutreachBtn').classList.add('hidden');

    showOnly(resultState);
  }

  // Patch in tier 2 fields (ATS + outreach) on top of already-rendered results.
  function renderTier2(data) {
    if (!lastAnalysis) return;
    Object.assign(lastAnalysis, data);

    // Outreach — swap skeleton for real card
    if (data.outreachMessage) {
      $('outreachSkeleton').classList.add('hidden');
      const outreachEl = $('outreachText');
      outreachEl.textContent = data.outreachMessage;
      outreachEl.classList.remove('hidden');
      const copyAllBtn = $('copyOutreachBtn');
      copyAllBtn.classList.remove('hidden');
      copyAllBtn.onclick = () => copyText(data.outreachMessage, copyAllBtn, '📋 Copy All');
    }

    // ATS — swap skeleton for real rings + breakdown
    if (data.atsScore) {
      $('atsSkeleton').classList.add('hidden');
      $('atsRealContent').classList.remove('hidden');
      renderAts(data.atsScore); // renderAts replaces badge innerHTML with the score number
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
          bullets:        lastAnalysis.resumeBullets || [],
          outreachMessage: lastAnalysis.outreachMessage || '',
          jobDescription: pagePayload?.rawText || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      // Update bullets in place
      if (data.humanizedBullets?.length) {
        lastAnalysis.resumeBullets = data.humanizedBullets;
        renderBullets(data.humanizedBullets);
      }

      // Update outreach in place
      if (data.humanizedOutreach) {
        lastAnalysis.outreachMessage = data.humanizedOutreach;
        $('outreachText').textContent = data.humanizedOutreach;
        const copyAllBtn = $('copyOutreachBtn');
        copyAllBtn.onclick = () => copyText(data.humanizedOutreach, copyAllBtn, '📋 Copy All');
      }

      // Update human score ring
      if (typeof data.newHumanScore === 'number') {
        updateHumanRing(data.newHumanScore);
        if (lastAnalysis.atsScore) {
          lastAnalysis.atsScore.human = data.newHumanScore;
        }
      }

      lastAnalysis.humanized = true;
      setHumanizeDone();
    } catch (err) {
      console.error('[JobHuntOS] Humanize failed:', err.message);
      setHumanizeIdle(); // reset so they can retry
    }
  }

  // ── Resume section ──

  function showResumeSection() {
    $('resumeSection').classList.remove('hidden');
    $('resumeResult').classList.add('hidden');
    setResumeIdle();
  }

  function setResumeIdle() {
    const btn = $('resumeBtn');
    btn.disabled = false;
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
    btn.disabled = true;
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

      // Show result panel
      const resultEl = $('resumeResult');
      resultEl.classList.remove('hidden');
      $('resumeNote').textContent =
        `Resume tailored for ${lastAnalysis.company || 'Company'} — ${lastAnalysis.role || 'Role'}`;
      $('resumeNotionLink').href = data.notionResumeUrl || '#';

      // Wire download button
      const dlBtn = $('resumeDownloadBtn');
      dlBtn.onclick = () => {
        const bytes = atob(data.docxBase64);
        const arr   = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = data.filename || 'Resume.docx';
        a.click();
        URL.revokeObjectURL(url);
      };

      // Change button to "Re-generate"
      const btn = $('resumeBtn');
      btn.disabled = false;
      btn.className = 'btn-resume';
      $('resumeBtnInner').innerHTML = `↻ Re-generate Resume`;

    } catch (err) {
      console.error('[JobHuntOS] Resume generation failed:', err.message);
      setResumeIdle();
      // Show inline error without leaving the results screen
      $('resumeNote').textContent = `Error: ${err.message}`;
      $('resumeResult').classList.remove('hidden');
    }
  }

  // ── Autofill ──

  let autofillActive = false;

  function showAutofillBtn() {
    $('autofillBtn').classList.remove('hidden');
  }

  function setAutofillIdle() {
    const btn = $('autofillBtn');
    btn.disabled = false;
    btn.textContent = '⚡ Autofill Application';
    btn.className = 'btn-autofill';
  }

  function setAutofillLoading() {
    const btn = $('autofillBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="save-spinner"></span> Generating fill values…';
    btn.className = 'btn-autofill btn-autofill--loading';
  }

  function setAutofillDone(count, platform) {
    autofillActive = true;
    const btn = $('autofillBtn');
    btn.disabled = false;
    btn.textContent = `✓ ${count} field${count !== 1 ? 's' : ''} filled — Undo`;
    btn.className = 'btn-autofill btn-autofill--done';

    const summary = $('autofillSummary');
    summary.classList.remove('hidden');
    summary.innerHTML = `
      <span class="autofill-count">⚡ ${count} fields filled on this page</span>
      <span class="autofill-platform">Platform: ${platform}</span>
      <span class="autofill-warning">⚠ Review all fields before submitting</span>
    `;
  }

  function setAutofillError(msg) {
    const btn = $('autofillBtn');
    btn.disabled = false;
    btn.textContent = '⚡ Autofill Application';
    btn.className = 'btn-autofill btn-autofill--error';

    const summary = $('autofillSummary');
    summary.classList.remove('hidden');
    summary.innerHTML = `<span class="autofill-warning">✕ ${msg}</span>`;
  }

  async function runAutofill() {
    if (!lastAnalysis) return;

    // If already filled → undo
    if (autofillActive) {
      chrome.tabs.query({}, (tabs) => {
        // Find the most recently active non-extension tab
        const target = tabs
          .filter(t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'))
          .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
        if (target) {
          chrome.tabs.sendMessage(target.id, { type: 'UNDO_AUTOFILL' }, () => {
            void chrome.runtime.lastError; // swallow
          });
        }
        autofillActive = false;
        setAutofillIdle();
        $('autofillSummary').classList.add('hidden');
        // Clear storage so pending autofill doesn't fire on the next page
        chrome.storage.local.remove('jhos_pending_autofill');
      });
      return;
    }

    setAutofillLoading();
    const profile = userProfile || '';

    // Find whichever tab has an application form (last non-sidebar tab)
    chrome.tabs.query({}, async (tabs) => {
      const target = tabs
        .filter(t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'))
        .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];

      if (!target) {
        setAutofillError('No open tab found. Navigate to the application form first.');
        return;
      }

      // Try direct message to the current tab first (same-tab case)
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
        // Content script not yet in the tab — queue via background (P1+P2 fix)
        // Background will inject scripts, then the storage-based auto-start picks it up
        chrome.runtime.sendMessage({
          type: 'QUEUE_AUTOFILL',
          payload: {
            autofillValues: null, // will be generated by content script after load
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
    $('applySection').classList.remove('hidden');
  }

  function setApplyIdle() {
    const btn = $('applyBtn');
    btn.disabled = false;
    btn.className = 'btn-apply';
    btn.textContent = '🚀 Apply to This Job';
    $('applyStatus').innerHTML = '';
  }

  function setApplyLoading(msg) {
    const btn = $('applyBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="save-spinner"></span> ${msg}`;
    btn.className = 'btn-apply';
  }

  function setApplyDone() {
    const btn = $('applyBtn');
    btn.disabled = false;
    btn.className = 'btn-apply btn-apply--done';
    btn.textContent = '✓ Application ready — switch to form tab';
  }

  function setApplyError(msg) {
    const btn = $('applyBtn');
    btn.disabled = false;
    btn.className = 'btn-apply btn-apply--error';
    btn.textContent = '⚠ ' + msg;
  }

  async function handleApply() {
    if (!lastAnalysis) return;
    setApplyLoading('Generating autofill data…');

    try {
      const profile = userProfile || '';

      // Step 1: store profile + analysis in storage; content script generates
      // autofill values on the application page itself.
      await new Promise(resolve =>
        chrome.storage.local.set({
          jhos_pending_autofill: {
            autofillValues: null,   // generated on the application page
            profileData:    profile,
            analysisData:   lastAnalysis,
            triggeredAt:    Date.now(),
            status:         'pending',
          }
        }, resolve)
      );

      setApplyLoading('Finding Apply button…');

      // Step 2: tell content.js to click the Apply button on the current page
      const clicked = await new Promise((resolve) => {
        chrome.tabs.query({}, (tabs) => {
          const target = tabs
            .filter(t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'))
            .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
          if (!target) { resolve(false); return; }
          chrome.tabs.sendMessage(target.id, { type: 'FIND_AND_CLICK_APPLY' }, (res) => {
            void chrome.runtime.lastError;
            resolve(res?.clicked || false);
          });
        });
      });

      setApplyDone();
      $('applyStatus').innerHTML = clicked
        ? `<span style="color:var(--green)">✓ Apply button clicked — autofill queued for the form</span>`
        : `<span style="color:var(--amber)">⚠ Couldn't find Apply button — click it manually. Autofill is ready.</span>`;

    } catch (err) {
      setApplyError('Failed: ' + err.message);
    }
  }

  // ── Event listeners ──

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

  // ── Messages from content.js ──

  window.addEventListener('message', (event) => {
    const { type, url, rawText, message } = event.data || {};

    if (type === 'PAGE_DATA') {
      pagePayload = { url, rawText };
      setUrlBar(url, false);
    }

    if (type === 'URL_CHANGED') {
      if (url === currentUrl) return;
      setUrlBar(url, hasAnalyzed);
      if (autoReanalyze && hasAnalyzed) {
        resetToWelcome('New job detected! Click Analyze This Job');
      }
    }

    if (type === 'EXTRACTION_ERROR') {
      showError(message || 'Could not extract job description.');
    }
  });

  showOnly(welcomeState);
})();
