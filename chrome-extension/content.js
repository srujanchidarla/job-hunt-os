(() => {
  const SIDEBAR_ID = 'jobhuntos-iframe-root';
  const ORIGIN     = 'chrome-extension://' + chrome.runtime.id;
  const IS_LINKEDIN = window.location.hostname.includes('linkedin.com');

  function getIframe() {
    const wrapper = document.getElementById(SIDEBAR_ID);
    return wrapper ? wrapper.querySelector('iframe') : null;
  }

  function getWrapper() {
    return document.getElementById(SIDEBAR_ID);
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
          console.log(`[JobHuntOS] LinkedIn selector matched: "${sel}" (${text.length} chars)`);
          break;
        }
      }
    }

    if (parts.length <= 2) {
      const main = document.querySelector('main');
      if (main) {
        const text = extractText(main);
        parts.push(text);
        console.log(`[JobHuntOS] LinkedIn fallback: <main> (${text.length} chars)`);
      } else {
        const divs = document.body.querySelectorAll(':scope > div');
        const second = divs[1] || divs[0];
        if (second) {
          const text = extractText(second);
          parts.push(text);
          console.log(`[JobHuntOS] LinkedIn fallback: second div (${text.length} chars)`);
        }
      }
    }

    return parts.join('\n\n');
  }

  function getGenericText() {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll(NOISE_SELECTOR).forEach((n) => n.remove());
    return (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function getPageText() {
    const raw  = IS_LINKEDIN ? getLinkedInText() : getGenericText();
    const text = raw.replace(/\s+/g, ' ').trim().slice(0, 6000);
    console.log(`[JobHuntOS] Extracted ${text.length} chars (LinkedIn: ${IS_LINKEDIN})`);
    return text;
  }

  // ── Messaging ──

  function postToSidebar(payload) {
    const iframe = getIframe();
    iframe?.contentWindow?.postMessage(payload, ORIGIN);
  }

  function sendPageData() {
    const rawText = getPageText();

    if (rawText.length < 200) {
      postToSidebar({
        type: 'EXTRACTION_ERROR',
        message: 'Could not extract job description. Try scrolling to load the full job details first.',
      });
      console.warn(`[JobHuntOS] Text too short (${rawText.length} chars) — aborting`);
      return;
    }

    const payload = {
      type: 'PAGE_DATA',
      url: window.location.href,
      rawText,
    };

    // Retry until iframe is ready
    let attempts = 0;
    const interval = setInterval(() => {
      postToSidebar(payload);
      if (++attempts >= 5) clearInterval(interval);
    }, 400);
  }

  // ── URL change detection ──

  let lastUrl = window.location.href;
  let urlChangeTimer = null;

  function handleUrlChange(newUrl) {
    console.log(`[JobHuntOS] URL changed: ${newUrl}`);
    lastUrl = newUrl;

    // Notify sidebar of the URL change immediately
    postToSidebar({ type: 'URL_CHANGED', url: newUrl });

    // Wait for SPA to render new content (LinkedIn needs ~1500ms)
    clearTimeout(urlChangeTimer);
    urlChangeTimer = setTimeout(() => {
      const rawText = getPageText();
      postToSidebar({
        type: 'PAGE_DATA',
        url: newUrl,
        rawText: rawText.length >= 200 ? rawText : '',
      });
    }, IS_LINKEDIN ? 1500 : 600);
  }

  // Use both MutationObserver (fast) and setInterval (reliable fallback)
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) handleUrlChange(currentUrl);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) handleUrlChange(currentUrl);
  }, 1000);

  // ── Sidebar lifecycle ──

  function openSidebar() {
    const wrapper = getWrapper();

    if (wrapper) {
      wrapper.style.transform = 'translateX(0)';
      wrapper.dataset.open = 'true';
      sendPageData();
      return;
    }

    const newWrapper = document.createElement('div');
    newWrapper.id = SIDEBAR_ID;
    Object.assign(newWrapper.style, {
      position:   'fixed',
      top:        '0',
      right:      '0',
      width:      '400px',
      height:     '100vh',
      zIndex:     '2147483647',
      border:     'none',
      boxShadow:  '-8px 0 32px rgba(0,0,0,0.5)',
      transform:  'translateX(0)',
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

    iframe.onload = () => sendPageData();
  }

  function closeSidebar() {
    const wrapper = getWrapper();
    if (wrapper) {
      wrapper.style.transform = 'translateX(100%)';
      wrapper.dataset.open = 'false';
    }
  }

  function toggleSidebar() {
    const wrapper = getWrapper();
    if (wrapper?.dataset.open === 'true') closeSidebar();
    else openSidebar();
  }

  // ── Inbound messages from sidebar ──

  window.addEventListener('message', (event) => {
    if (!event.origin.startsWith('chrome-extension://')) return;
    if (event.data?.type === 'CLOSE_SIDEBAR') closeSidebar();
    if (event.data?.type === 'RETRY') sendPageData();
  });

  // ── Message from background ──

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'TOGGLE_SIDEBAR') { toggleSidebar(); return; }

    if (msg.type === 'START_AUTOFILL') {
      (async () => {
        try {
          const autofiller = new JobHuntOSAutofill(msg.profileData, msg.analysisData);

          // P3 FIX: Wait for fields to actually render (React/Angular forms)
          const fields = await autofiller.waitForFields();
          if (!fields.length) {
            sendResponse({ success: false, error: 'No fillable form fields found on this page. Make sure you\'re on an application form.' });
            return;
          }

          // Ask backend to generate values
          const res = await fetch('http://localhost:3000/api/generate-autofill', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userProfile:  msg.profileData,
              jobAnalysis:  msg.analysisData,
              formFields:   fields.map(f => ({
                label:   f.label,
                type:    f.type,
                name:    f.name,
                options: f.options,
              })),
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

          // Store autofiller on window so undo message handler can reach it
          window._jhosAutofiller = autofiller;

          const filledCount = await autofiller.autofill(data.autofillValues);
          sendResponse({ success: true, filledCount, platform: autofiller.platform });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true; // keep channel open for async response
    }

    if (msg.type === 'UNDO_AUTOFILL') {
      if (window._jhosAutofiller) {
        window._jhosAutofiller.undo();
        window._jhosAutofiller = null;
      }
      sendResponse({ success: true });
    }

    if (msg.type === 'FIND_AND_CLICK_APPLY') {
      // Try to find and click the Apply/Easy Apply button on this job posting page
      const APPLY_SELECTORS = [
        // LinkedIn Easy Apply
        '.jobs-apply-button--top-card button',
        'button.jobs-apply-button',
        '.jobs-s-apply button',
        'button[aria-label*="Easy Apply"]',
        'button[aria-label*="Apply"]',
        // Generic apply links/buttons
        'a[href*="/apply"]',
        '.apply-button',
        '[data-qa="btn-apply"]',
        '[data-testid*="apply"]',
        '[class*="apply-btn"]',
        '[id*="apply-btn"]',
      ];

      let clicked = false;
      for (const sel of APPLY_SELECTORS) {
        try {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const text = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
            if (text.includes('apply') || text.includes('application')) {
              el.click();
              clicked = true;
              break;
            }
          }
        } catch { /* bad selector */ }
        if (clicked) break;
      }

      // Fallback: look for any button/link with "apply" in text
      if (!clicked) {
        const all = [...document.querySelectorAll('button, a')];
        const match = all.find(el => {
          const t = el.textContent.trim().toLowerCase();
          return (t === 'apply' || t === 'apply now' || t === 'easy apply' || t === 'apply for job') && t.length < 30;
        });
        if (match) { match.click(); clicked = true; }
      }

      sendResponse({ clicked });
    }
  });
})();
