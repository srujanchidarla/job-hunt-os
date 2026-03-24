(() => {
  const BACKEND_PARSE_PROFILE = 'http://localhost:3000/api/parse-profile';

  const $ = (id) => document.getElementById(id);

  // ── Tab switching ──

  const tabBtns   = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  let activeTab   = 'upload';

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
      tabPanels.forEach(p => p.classList.toggle('hidden', p.id !== `tab-${activeTab}`));
      hideStatus();
    });
  });

  // ── File upload / drag-drop ──

  let selectedFile = null;

  const dropzone    = $('dropzone');
  const fileInput   = $('fileInput');
  const browseBtn   = $('browseBtn');
  const fileSelected = $('fileSelected');
  const fileNameEl  = $('fileName');
  const clearFileBtn = $('clearFileBtn');

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFileSelect(fileInput.files[0]);
  });

  clearFileBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    fileSelected.classList.add('hidden');
    dropzone.classList.remove('hidden');
    hideStatus();
  });

  function handleFileSelect(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      showStatus('Only PDF and DOCX files are supported.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showStatus('File is too large. Max size is 5MB.', 'error');
      return;
    }
    selectedFile = file;
    fileNameEl.textContent = file.name;
    fileSelected.classList.remove('hidden');
    dropzone.classList.add('hidden');
    hideStatus();
  }

  // ── LinkedIn tab ──

  $('useLinkedInBtn').addEventListener('click', async () => {
    const btn = $('useLinkedInBtn');
    const hint = $('linkedinHint');
    btn.disabled = true;
    btn.textContent = 'Extracting…';
    hideStatus();

    try {
      // Ask the background script for the active tab's URL and text
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
        showStatus('Could not extract enough text from the page. Try the Paste Resume tab instead.', 'error');
        btn.disabled = false;
        btn.textContent = 'Extract from Current LinkedIn Page';
        return;
      }

      await parseTextAndSave(text);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Extract from Current LinkedIn Page';
      showStatus(`Error: ${err.message}`, 'error');
    }
  });

  // ── Paste char count ──

  const pasteArea = $('pasteArea');
  const pasteCharCount = $('pasteCharCount');

  pasteArea.addEventListener('input', () => {
    const len = pasteArea.value.length;
    pasteCharCount.textContent = `${len} character${len === 1 ? '' : 's'}`;
  });

  // ── Status helpers ──

  function showStatus(msg, type = 'info') {
    const el = $('setupStatus');
    el.className = `setup-status ${type}`;
    $('setupStatusMsg').textContent = msg;
    el.classList.remove('hidden');
  }

  function hideStatus() {
    $('setupStatus').classList.add('hidden');
  }

  // ── Save button state ──

  function setSaving() {
    const btn = $('saveProfileBtn');
    btn.disabled = true;
    $('saveProfileBtnInner').innerHTML = `<span class="setup-spinner"></span> Parsing your profile…`;
  }

  function setIdle() {
    const btn = $('saveProfileBtn');
    btn.disabled = false;
    $('saveProfileBtnInner').textContent = 'Save Profile & Continue →';
  }

  // ── Main save handler ──

  $('saveProfileBtn').addEventListener('click', () => saveProfile());

  async function saveProfile() {
    hideStatus();

    if (activeTab === 'upload') {
      if (!selectedFile) {
        showStatus('Please select a PDF or DOCX file first.', 'error');
        return;
      }
      await parseFileAndSave(selectedFile);
    } else {
      const text = pasteArea.value.trim();
      if (text.length < 100) {
        showStatus('Please paste more resume text (at least 100 characters).', 'error');
        return;
      }
      await parseTextAndSave(text);
    }
  }

  async function parseFileAndSave(file) {
    setSaving();
    try {
      const base64 = await fileToBase64(file);
      const ext    = file.name.split('.').pop().toLowerCase();
      const res = await fetch(BACKEND_PARSE_PROFILE, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fileBase64: base64, fileType: ext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await persistProfile(data.parsedProfile);
    } catch (err) {
      setIdle();
      showStatus(`Error: ${err.message}`, 'error');
    }
  }

  async function parseTextAndSave(text) {
    setSaving();
    try {
      const res = await fetch(BACKEND_PARSE_PROFILE, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await persistProfile(data.parsedProfile);
    } catch (err) {
      setIdle();
      showStatus(`Error: ${err.message}`, 'error');
    }
  }

  async function persistProfile(parsedProfile) {
    chrome.storage.local.set({
      userProfile:   parsedProfile,
      setupComplete: true,
    }, () => {
      showStatus('Profile saved! Returning to analyzer…', 'success');
      setTimeout(() => {
        window.parent.postMessage({ type: 'SETUP_COMPLETE' }, '*');
      }, 800);
    });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => {
        // result is "data:...;base64,<data>" — strip the prefix
        const b64 = reader.result.split(',')[1];
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Skip / back button ──

  const skipBtn = $('skipBtn');

  // Check if there's already a profile; show back button only if so
  chrome.storage.local.get(['setupComplete'], (result) => {
    if (result.setupComplete) {
      skipBtn.classList.remove('hidden');
    } else {
      skipBtn.classList.add('hidden');
    }
  });

  skipBtn.addEventListener('click', () => {
    window.parent.postMessage({ type: 'SETUP_SKIP' }, '*');
  });

})();
