(() => {
  const SIDEBAR_ID       = 'jobhuntos-iframe-root';
  const ORIGIN           = 'chrome-extension://' + chrome.runtime.id;
  const JHOS_STORAGE_KEY = 'jhos_pending_autofill';
  const IS_LINKEDIN      = window.location.hostname.includes('linkedin.com');

  // ── Page type detection ──

  function detectPageType(url) {
    try {
      const u    = new URL(url);
      const host = u.hostname;
      const path = u.pathname;

      // Form patterns
      if (/greenhouse\.io/.test(host) && /\/apply/.test(path)) return 'form';
      if (/lever\.co/.test(host) && /\/apply/.test(path)) return 'form';
      if (/workday\.com/.test(host) && /\/job/.test(path)) return 'form';
      if (/myworkdayjobs\.com/.test(host)) return 'form';
      if (/icims\.com/.test(host)) return 'form';
      if (/smartrecruiters\.com/.test(host) && /\/apply/.test(path)) return 'form';
      if (/jobvite\.com/.test(host) && /\/apply/.test(path)) return 'form';
      if (/ashbyhq\.com/.test(host)) return 'form';
      if (/bamboohr\.com/.test(host)) return 'form';
      if (/amazon\.jobs/.test(host) && /\/apply/.test(path)) return 'form';
      if (/account\.amazon\.jobs/.test(host)) return 'form';
      if (/linkedin\.com/.test(host) && /\/jobs\/apply/.test(path)) return 'form';
      if (/indeed\.com/.test(host) && /\/apply/.test(path)) return 'form';

      // Listing patterns
      if (/linkedin\.com/.test(host) && /\/jobs\/(view|collections|search)/.test(path)) return 'listing';
      if (/indeed\.com/.test(host) && /\/viewjob/.test(path)) return 'listing';
      if (/glassdoor\.com/.test(host) && /\/job-listing/.test(path)) return 'listing';
      if (/wellfound\.com/.test(host) && /\/jobs/.test(path)) return 'listing';
      if (/builtin\.com/.test(host) && /\/job/.test(path)) return 'listing';

      // Secondary detection: count visible inputs
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).filter(el => {
        const t = (el.type || '').toLowerCase();
        return t !== 'hidden' && t !== 'submit' && t !== 'button' && t !== 'password';
      });
      if (inputs.length >= 4) return 'form';

      return 'listing';
    } catch {
      return 'listing';
    }
  }

  // ── Job info detection ──

  function detectJobInfo() {
    let title   = '';
    let company = '';

    if (IS_LINKEDIN) {
      const titleEl = document.querySelector(
        'h1[class*="job-title"], .job-details-jobs-unified-top-card__job-title h1, .job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1'
      );
      if (titleEl) title = titleEl.innerText.trim();

      const companyEl = document.querySelector(
        '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name'
      );
      if (companyEl) company = companyEl.innerText.trim();
    } else if (window.location.hostname.includes('indeed.com')) {
      const titleEl = document.querySelector('h1.jobsearch-JobInfoHeader-title, h1[data-testid="jobsearch-JobInfoHeader-title"]');
      if (titleEl) title = titleEl.innerText.trim();

      const companyEl = document.querySelector('.jobsearch-InlineCompanyRating, [data-testid="inlineHeader-companyName"]');
      if (companyEl) company = companyEl.innerText.trim().split('\n')[0];
    } else {
      const h1 = document.querySelector('h1');
      if (h1) title = h1.innerText.trim();

      // Look for company near h1
      const meta = document.querySelector('[itemprop="hiringOrganization"], [class*="company"], [class*="employer"]');
      if (meta) company = meta.innerText.trim().split('\n')[0];
    }

    return { title: title.slice(0, 80), company: company.slice(0, 60) };
  }

  // ── Text extraction ──

  const LINKEDIN_SELECTORS = [
    '.job-view-layout',
    '.jobs-description',
    '.jobs-description-content',
    '.job-details-jobs-unified-top-card__job-title',
    '[class*="job-details"]',
    '[class*="jobs-description"]',
    '.jobs-box--fadein',
  ];

  const NOISE_SELECTOR =
    'script,style,nav,header,footer,aside,[role="banner"],[role="navigation"],[role="complementary"]';

  function extractText(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll(NOISE_SELECTOR).forEach((n) => n.remove());
    return (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function getLinkedInText() {
    const parts = [];

    const titleEl = document.querySelector(
      '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1'
    );
    if (titleEl) parts.push(titleEl.innerText.trim());

    const companyEl = document.querySelector(
      '.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name'
    );
    if (companyEl) parts.push(companyEl.innerText.trim());

    for (const sel of LINKEDIN_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) {
        const text = extractText(el);
        if (text.length > 200) {
          parts.push(text);
          break;
        }
      }
    }

    if (parts.length <= 2) {
      const main = document.querySelector('main');
      if (main) {
        parts.push(extractText(main));
      } else {
        const divs = document.body.querySelectorAll(':scope > div');
        const second = divs[1] || divs[0];
        if (second) parts.push(extractText(second));
      }
    }

    return parts.join('\n\n');
  }

  function getGenericText() {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll(NOISE_SELECTOR).forEach((n) => n.remove());
    return (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function extractPageText() {
    const raw  = IS_LINKEDIN ? getLinkedInText() : getGenericText();
    const text = raw.replace(/\s+/g, ' ').trim().slice(0, 3000);
    console.log(`[JobHuntOS] Extracted ${text.length} chars`);
    return text;
  }

  // ── Sidebar helpers ──

  function getIframe() {
    const wrapper = document.getElementById(SIDEBAR_ID);
    return wrapper ? wrapper.querySelector('iframe') : null;
  }

  function getWrapper() {
    return document.getElementById(SIDEBAR_ID);
  }

  function isSidebarOpen() {
    return getWrapper()?.dataset.open === 'true';
  }

  function sendToSidebar(payload) {
    const iframe = getIframe();
    iframe?.contentWindow?.postMessage(payload, ORIGIN);
  }

  function buildPageData() {
    const url      = window.location.href;
    const rawText  = extractPageText();
    const pageType = detectPageType(url);
    const jobInfo  = detectJobInfo();
    return { type: 'PAGE_DATA', url, rawText, pageType, jobInfo };
  }

  function sendPageData() {
    const payload = buildPageData();
    let attempts  = 0;
    const interval = setInterval(() => {
      sendToSidebar(payload);
      if (++attempts >= 5) clearInterval(interval);
    }, 400);
  }

  // ── Sidebar lifecycle ──

  function openSidebar(mode) {
    const wrapper = getWrapper();

    if (wrapper) {
      wrapper.style.transform = 'translateX(0)';
      wrapper.dataset.open    = 'true';
      document.body.style.marginRight = '380px';
      document.body.style.transition  = 'margin-right 0.3s cubic-bezier(0.4,0,0.2,1)';
      sendPageData();
      return;
    }

    const newWrapper = document.createElement('div');
    newWrapper.id = SIDEBAR_ID;
    Object.assign(newWrapper.style, {
      position:   'fixed',
      top:        '0',
      right:      '0',
      width:      '380px',
      height:     '100vh',
      zIndex:     '2147483647',
      border:     'none',
      boxShadow:  '-8px 0 32px rgba(0,0,0,0.5)',
      transform:  'translateX(100%)',
      transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
    });

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('sidebar.html');
    Object.assign(iframe.style, {
      width:   '100%',
      height:  '100%',
      border:  'none',
      display: 'block',
    });

    newWrapper.dataset.open = 'true';
    newWrapper.appendChild(iframe);
    document.body.appendChild(newWrapper);

    // Slide in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        newWrapper.style.transform = 'translateX(0)';
      });
    });

    // Push page
    document.body.style.transition  = 'margin-right 0.3s cubic-bezier(0.4,0,0.2,1)';
    document.body.style.marginRight = '380px';

    iframe.onload = () => sendPageData();
  }

  function closeSidebar() {
    const wrapper = getWrapper();
    if (wrapper) {
      wrapper.style.transform = 'translateX(100%)';
      wrapper.dataset.open    = 'false';
    }
    document.body.style.marginRight = '0px';
  }

  function toggleSidebar() {
    if (isSidebarOpen()) closeSidebar();
    else openSidebar();
  }

  // ── Apply button selectors ──

  const APPLY_SELECTORS = [
    '.jobs-apply-button--top-card button',
    'button.jobs-apply-button',
    '.jobs-s-apply button',
    'button[aria-label*="Easy Apply"]',
    'button[aria-label*="Apply"]',
    'a[href*="/apply"]',
    '.apply-button',
    '[data-qa="btn-apply"]',
    '[data-testid*="apply"]',
    '[class*="apply-btn"]',
    '[id*="apply-btn"]',
  ];

  function findAndClickApply() {
    for (const sel of APPLY_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) {
        el.click();
        return true;
      }
    }

    // Fallback: text-based search
    const candidates = Array.from(document.querySelectorAll('button, a'));
    for (const el of candidates) {
      const text = (el.innerText || el.textContent || '').trim().toLowerCase();
      if (text.length < 30 && ['apply', 'apply now', 'easy apply', 'apply for job'].includes(text)) {
        el.click();
        return true;
      }
    }
    return false;
  }

  // ── URL change detection ──

  let lastUrl       = window.location.href;
  let urlChangeTimer = null;

  function handleUrlChange(newUrl) {
    console.log(`[JobHuntOS] URL changed: ${newUrl}`);
    lastUrl = newUrl;

    const pageType = detectPageType(newUrl);
    const jobInfo  = detectJobInfo();

    sendToSidebar({ type: 'URL_CHANGED', url: newUrl, pageType, jobInfo });

    clearTimeout(urlChangeTimer);
    urlChangeTimer = setTimeout(async () => {
      // Check if pending autofill exists and page is form
      chrome.storage.local.get([JHOS_STORAGE_KEY], (result) => {
        const pending = result[JHOS_STORAGE_KEY];
        if (pending && pageType === 'form' && !isSidebarOpen()) {
          openSidebar('form');
        }
      });

      const rawText = extractPageText();
      sendToSidebar({
        type: 'PAGE_DATA',
        url: newUrl,
        rawText: rawText.length >= 200 ? rawText : '',
        pageType,
        jobInfo,
      });
    }, IS_LINKEDIN ? 1500 : 800);
  }

  const observer = new MutationObserver(() => {
    const cur = window.location.href;
    if (cur !== lastUrl) handleUrlChange(cur);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    const cur = window.location.href;
    if (cur !== lastUrl) handleUrlChange(cur);
  }, 1000);

  // ── Question scanning for form mode ──

  function scanQuestions() {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select')).filter(el => {
      const t = (el.type || '').toLowerCase();
      return t !== 'hidden' && t !== 'submit' && t !== 'button' && t !== 'password';
    });

    return inputs.map(el => {
      // Find associated label
      let label = '';
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) label = labelEl.innerText.trim();
      }
      if (!label) {
        const parent = el.closest('label, [class*="field"], [class*="form-group"], [class*="question"]');
        if (parent) {
          const labelEl = parent.querySelector('label, [class*="label"], legend');
          if (labelEl) label = labelEl.innerText.trim();
        }
      }
      if (!label) {
        label = el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.name || el.id || 'Unknown field';
      }

      const options = el.tagName === 'SELECT'
        ? Array.from(el.options).map(o => o.text.trim()).filter(Boolean)
        : [];

      return {
        label:   label.slice(0, 120),
        type:    el.type || el.tagName.toLowerCase(),
        name:    el.name || el.id || '',
        options,
        element: el,
      };
    });
  }

  // ── Messages from sidebar ──

  window.addEventListener('message', (event) => {
    if (!event.origin.startsWith('chrome-extension://')) return;
    const { type } = event.data || {};

    if (type === 'CLOSE_SIDEBAR') {
      closeSidebar();
    }

    if (type === 'RETRY' || type === 'REQUEST_PAGE_DATA') {
      sendPageData();
    }

    if (type === 'FIND_AND_CLICK_APPLY') {
      const clicked = findAndClickApply();
      sendToSidebar({ type: 'APPLY_CLICK_RESULT', clicked });
    }

    if (type === 'SCAN_QUESTIONS') {
      const questions = scanQuestions();
      sendToSidebar({ type: 'QUESTIONS_SCANNED', questions: questions.map(q => ({ label: q.label, type: q.type, name: q.name, options: q.options })) });
    }

    if (type === 'EXECUTE_AUTOFILL') {
      (async () => {
        const { autofillValues, analysisData } = event.data;
        if (!window._jhosAutofiller) {
          const profile = await new Promise(resolve => {
            chrome.storage.local.get(['userProfile'], r => resolve(r.userProfile || ''));
          });
          window._jhosAutofiller = new JobHuntOSAutofill(profile, analysisData || {});
        }

        const questions = scanQuestions();
        let filledCount = 0;

        for (let i = 0; i < questions.length; i++) {
          const q   = questions[i];
          const val = autofillValues?.[i] ?? autofillValues?.[q.name] ?? autofillValues?.[q.label];
          if (!val) continue;

          try {
            sendToSidebar({ type: 'FILL_PROGRESS', index: i });
            const el = q.element;
            if (el.tagName === 'SELECT') {
              const opt = Array.from(el.options).find(o => o.text.toLowerCase().includes(String(val).toLowerCase()));
              if (opt) { el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); filledCount++; }
            } else if (el.type === 'checkbox') {
              el.checked = Boolean(val);
              el.dispatchEvent(new Event('change', { bubbles: true }));
              filledCount++;
            } else if (el.type === 'radio') {
              const radios = document.querySelectorAll(`input[type="radio"][name="${el.name}"]`);
              for (const r of radios) {
                if (r.value.toLowerCase().includes(String(val).toLowerCase())) {
                  r.click();
                  filledCount++;
                  break;
                }
              }
            } else {
              el.focus();
              el.value = String(val);
              el.dispatchEvent(new Event('input',  { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              el.blur();
              filledCount++;
            }
          } catch (err) {
            sendToSidebar({ type: 'FILL_ERROR', index: i });
          }
        }

        sendToSidebar({ type: 'FILL_COMPLETE', filledCount });
      })();
    }
  });

  // ── Messages from background ──

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'TOGGLE_SIDEBAR') {
      toggleSidebar();
      return;
    }

    if (msg.type === 'START_AUTOFILL') {
      (async () => {
        try {
          const autofiller = new JobHuntOSAutofill(msg.profileData, msg.analysisData);
          const fields = await autofiller.waitForFields();
          if (!fields.length) {
            sendResponse({ success: false, error: 'No fillable form fields found on this page.' });
            return;
          }

          const res = await fetch('http://localhost:3000/api/generate-autofill', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userProfile: msg.profileData,
              jobAnalysis: msg.analysisData,
              formFields:  fields.map(f => ({ label: f.label, type: f.type, name: f.name, options: f.options })),
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

          window._jhosAutofiller = autofiller;
          const filledCount = await autofiller.autofill(data.autofillValues);
          sendResponse({ success: true, filledCount, platform: autofiller.platform });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    if (msg.type === 'UNDO_AUTOFILL') {
      if (window._jhosAutofiller) {
        window._jhosAutofiller.undo();
        window._jhosAutofiller = null;
      }
      sendResponse({ success: true });
    }

    if (msg.type === 'FIND_AND_CLICK_APPLY') {
      const clicked = findAndClickApply();
      sendResponse({ clicked });
    }
  });

  // ── On load: check for pending autofill ──

  chrome.storage.local.get([JHOS_STORAGE_KEY], (result) => {
    const pending  = result[JHOS_STORAGE_KEY];
    const pageType = detectPageType(window.location.href);

    if (pending && pageType === 'form') {
      // Auto-open sidebar in form mode after short delay
      setTimeout(() => {
        if (!isSidebarOpen()) openSidebar('form');
      }, 1500);
    }
  });

})();
