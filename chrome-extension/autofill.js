/* JobHuntOS Autofill — injected into every page via content_scripts */
/* eslint-disable no-unused-vars */

// ── Constants ────────────────────────────────────────────────────────────────

const JHOS_STORAGE_KEY = 'jhos_pending_autofill';
const JHOS_MAX_WAIT_MS = 12000;   // wait up to 12s for form fields to appear
const JHOS_POLL_MS     = 400;     // poll interval
const JHOS_REFILL_DEBOUNCE = 600; // ms to debounce MutationObserver re-fills

// ── Blocked field patterns (safety) ─────────────────────────────────────────

const BLOCKED_PATTERNS = [
  /password/i, /passwd/i, /\bsecret\b/i, /\btoken\b/i,
  /\blogin\b/i, /\bsignin\b/i, /credit.?card/i, /\bcvv\b/i,
  /\bcvc\b/i, /expiry/i, /billing/i, /\bpayment\b/i,
  /social.?security/i, /\bssn\b/i, /\bbank\b/i, /routing/i,
  /account.?number/i,
];

// ── Shadow DOM traversal ─────────────────────────────────────────────────────

/**
 * querySelectorAllDeep — like querySelectorAll but pierces shadow roots
 * Returns a flat array of matching elements across the entire DOM tree.
 */
function querySelectorAllDeep(selector, root = document) {
  const results = [];

  function walk(node) {
    // Query this node's regular DOM
    try {
      node.querySelectorAll(selector).forEach(el => results.push(el));
    } catch { /* bad selector in this context — skip */ }

    // Recurse into shadow roots attached to any element in this subtree
    const all = node.querySelectorAll ? Array.from(node.querySelectorAll('*')) : [];
    for (const el of all) {
      if (el.shadowRoot) walk(el.shadowRoot);
    }
  }

  walk(root);
  return results;
}

// ── Main class ───────────────────────────────────────────────────────────────

class JobHuntOSAutofill {
  constructor(profileData, analysisData) {
    this.profile      = profileData  || '';
    this.analysis     = analysisData || {};
    this.filled       = [];   // [{ element, originalValue }]
    this.cachedValues = null; // AI-generated values, kept for re-fill on step change
    this.platform     = this.detectPlatform();
    this._refillTimer = null;
    this._observer    = null;
  }

  // ── Platform detection ────────────────────────────────────────────────────

  detectPlatform() {
    const h = window.location.hostname;
    if (h.includes('linkedin.com'))                                    return 'linkedin';
    if (h.includes('greenhouse.io'))                                   return 'greenhouse';
    if (h.includes('lever.co'))                                        return 'lever';
    if (h.includes('workday.com') || h.includes('myworkdayjobs.com')) return 'workday';
    if (h.includes('icims.com'))                                       return 'icims';
    if (h.includes('smartrecruiters.com'))                             return 'smartrecruiters';
    if (h.includes('jobvite.com'))                                     return 'jobvite';
    if (h.includes('ashbyhq.com'))                                     return 'ashby';
    return 'generic';
  }

  // ── Safety ────────────────────────────────────────────────────────────────

  isSafeField(el) {
    const combined = [el.name, el.id, el.placeholder, el.getAttribute('autocomplete')]
      .filter(Boolean).join(' ');
    return (el.type || '').toLowerCase() !== 'password' &&
           !BLOCKED_PATTERNS.some(re => re.test(combined));
  }

  // ── Label resolution ──────────────────────────────────────────────────────

  resolveLabel(el) {
    // 1. <label for="id"> (regular DOM and shadow DOM)
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
               || querySelectorAllDeep(`label[for="${CSS.escape(el.id)}"]`)[0];
      if (lbl) return lbl.innerText.replace(/[*:]/g, '').trim();
    }
    // 2. Wrapping <label>
    const wrap = el.closest('label');
    if (wrap) return wrap.innerText.replace(/[*:]/g, '').trim().slice(0, 120);
    // 3. aria-label
    const aria = el.getAttribute('aria-label');
    if (aria) return aria.trim();
    // 4. aria-labelledby (can be space-separated list of IDs)
    const lbids = (el.getAttribute('aria-labelledby') || '').split(' ').filter(Boolean);
    if (lbids.length) {
      const txt = lbids
        .map(id => document.getElementById(id)?.innerText?.trim())
        .filter(Boolean).join(' ');
      if (txt) return txt;
    }
    // 5. placeholder
    if (el.placeholder) return el.placeholder.trim();
    // 6. Nearest label/legend/span/p in parent
    const parent = el.parentElement;
    if (parent) {
      const candidates = parent.querySelectorAll('label, legend, span, p, strong');
      for (const c of candidates) {
        if (c !== el && !c.contains(el)) {
          const t = c.innerText?.trim();
          if (t && t.length < 120) return t;
        }
      }
    }
    return el.name || el.id || '';
  }

  // ── Field scanning (regular + shadow DOM) ─────────────────────────────────

  scanFormFields() {
    const SELECTOR = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
      ':not([type="reset"]):not([type="image"]):not([type="file"]):not([type="password"])',
      ', textarea, select',
    ].join('');

    const seen   = new Set();
    const fields = [];

    // Collect from regular DOM + all shadow roots
    const elements = querySelectorAllDeep(SELECTOR);

    for (const el of elements) {
      if (!this.isSafeField(el)) continue;
      const key = el.name || el.id || el.getAttribute('data-field') || el.getAttribute('data-id');
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      const label = this.resolveLabel(el);
      if (!label && !el.name && !el.id) continue;

      fields.push({
        element: el,
        label,
        type:    el.type || el.tagName.toLowerCase(),
        name:    el.name || el.id || '',
        options: el.tagName === 'SELECT'
          ? Array.from(el.options).map(o => o.text).filter(t => t.trim())
          : [],
      });
    }
    return fields;
  }

  // ── Semantic key matching ─────────────────────────────────────────────────

  matchKey(label, name) {
    const t = (label + ' ' + name).toLowerCase();

    if (/first.?name|given.?name/.test(t))                    return 'firstName';
    if (/last.?name|family.?name|surname/.test(t))            return 'lastName';
    if (/full.?name|your.?name|^name\b/.test(t))              return 'fullName';
    if (/\bemail\b/.test(t))                                  return 'email';
    if (/\bphone\b|\bmobile\b|\bcell\b/.test(t))              return 'phone';
    if (/linkedin/.test(t))                                   return 'linkedin';
    if (/github/.test(t))                                     return 'github';
    if (/portfolio|personal.?site/.test(t))                   return 'portfolio';
    if (/\bcity\b/.test(t))                                   return 'city';
    if (/\bstate\b|\bprovince\b/.test(t))                     return 'state';
    if (/zip|postal/.test(t))                                 return 'zip';
    if (/\bcountry\b/.test(t))                                return 'country';
    if (/salary|compensation|expected.?pay/.test(t))          return 'salary';
    if (/degree|education.?level/.test(t))                    return 'degree';
    if (/university|college|school/.test(t))                  return 'university';
    if (/\bmajor\b|field.?of.?study/.test(t))                 return 'major';
    if (/\bgpa\b|\bgrade\b/.test(t))                          return 'gpa';
    if (/grad.*year|graduation/.test(t))                      return 'gradYear';
    if (/years?.?of.?exp|experience.?years/.test(t))          return 'yearsExp';
    if (/current.?title|job.?title|position.?title/.test(t))  return 'currentTitle';
    if (/current.?company|employer/.test(t))                  return 'currentCompany';
    if (/cover.?letter/.test(t))                              return 'coverLetter';
    if (/why.*(company|us|role|position|join|want)/.test(t))  return 'whyCompany';
    if (/tell.*about.*yourself|about.?you|intro/.test(t))     return 'aboutYourself';
    if (/authorized|eligible.*work|work.*auth/.test(t))       return 'workAuth';
    if (/sponsor|require.*visa/.test(t))                      return 'sponsorship';
    if (/\bskills\b|technologies|tech.?stack/.test(t))        return 'skills';
    if (/greatest.?strength|top.?strength/.test(t))           return 'strength';
    if (/challenge|difficult|obstacle/.test(t))               return 'challenge';
    if (/achievement|proud|accomplish/.test(t))               return 'achievement';
    if (/available|start.?date|when.*start/.test(t))          return 'startDate';
    if (/remote|work.?from.?home|hybrid/.test(t))             return 'workType';
    if (/how.*hear|refer|source/.test(t))                     return 'referralSource';
    return null;
  }

  // ── Fill primitives (React/Vue/Angular compatible) ────────────────────────

  fillText(el, value) {
    // Use native prototype setter so React's synthetic event system sees the change
    const proto  = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

    el.focus();
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }

    // Fire the full event chain that React/Vue/Angular listen to
    ['input', 'change'].forEach(type => {
      el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    });
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
    el.dispatchEvent(new KeyboardEvent('keyup',   { bubbles: true, key: 'a' }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  fillSelect(el, value) {
    const opts  = Array.from(el.options);
    const lower = String(value).toLowerCase().trim();

    // Try exact match first, then prefix, then contains
    const match =
      opts.find(o => o.text.toLowerCase()  === lower || o.value.toLowerCase() === lower) ||
      opts.find(o => o.text.toLowerCase().startsWith(lower) || lower.startsWith(o.text.toLowerCase())) ||
      opts.find(o => o.text.toLowerCase().includes(lower) || lower.includes(o.text.toLowerCase()));

    if (match) {
      el.value = match.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  fillCheckbox(el, value) {
    const want = value === true || /^(yes|true|1)$/i.test(String(value));
    if (el.checked !== want) el.click();
  }

  fillRadio(el, value) {
    const name  = el.name ? `[name="${CSS.escape(el.name)}"]` : '';
    const group = querySelectorAllDeep(`input[type="radio"]${name}`);
    const lower = String(value).toLowerCase();
    for (const r of group) {
      const lbl = document.querySelector(`label[for="${CSS.escape(r.id)}"]`);
      const txt = (lbl?.innerText || r.value || '').toLowerCase();
      if (txt.includes(lower) || lower.includes(r.value.toLowerCase())) {
        r.click();
        break;
      }
    }
  }

  fillField(el, value) {
    if (!value || value === 'SKIP' || !this.isSafeField(el)) return false;
    const originalValue = el.value ?? '';
    try {
      const tag  = el.tagName.toLowerCase();
      const type = (el.type || '').toLowerCase();

      if (tag === 'select')         this.fillSelect(el, value);
      else if (type === 'checkbox') this.fillCheckbox(el, value);
      else if (type === 'radio')    this.fillRadio(el, value);
      else if (type === 'file')     return false;
      else                          this.fillText(el, value);

      this.filled.push({ element: el, originalValue });
      el._jhos_filled = true;

      // Purple ring highlight (fades after 2.5s)
      el.style.transition = 'box-shadow 0.3s';
      el.style.boxShadow  = 'inset 0 0 0 2px rgba(124,106,247,0.7)';
      setTimeout(() => { el.style.boxShadow = ''; }, 2500);

      return true;
    } catch (err) {
      console.warn('[JobHuntOS] Could not fill field', el.name || el.id, err.message);
      return false;
    }
  }

  // ── Platform-specific selectors ──────────────────────────────────────────

  platformSelectors() {
    return {
      greenhouse: {
        firstName:   '#first_name',
        lastName:    '#last_name',
        email:       '#email',
        phone:       '#phone',
        linkedin:    '[id*="linkedin"], [name*="linkedin"]',
        github:      '[id*="github"],   [name*="github"]',
        portfolio:   '[id*="website"],  [name*="website"]',
        coverLetter: '#cover_letter_text, textarea[name*="cover"]',
      },
      lever: {
        fullName:    '[name="name"]',
        email:       '[name="email"]',
        phone:       '[name="phone"]',
        linkedin:    '[name="urls[LinkedIn]"]',
        github:      '[name="urls[GitHub]"]',
        portfolio:   '[name="urls[Portfolio]"]',
        coverLetter: '[name="comments"]',
      },
      linkedin: {
        firstName:   '[name="firstName"],  [id*="first-name"],  [data-test-single-line-text-form-component]',
        lastName:    '[name="lastName"],   [id*="last-name"]',
        email:       '[name="email"],      [id*="email"]',
        phone:       '[name="phoneNumber"],[id*="phone"]',
        coverLetter: 'textarea[id*="cover"], textarea[name*="cover"], [data-test-cover-letter-textarea]',
      },
      ashby: {
        firstName:   '[name="firstName"],  input[placeholder*="First"]',
        lastName:    '[name="lastName"],   input[placeholder*="Last"]',
        email:       '[name="email"],      input[type="email"]',
        phone:       '[name="phone"],      input[type="tel"]',
        linkedin:    '[name="linkedinUrl"],[placeholder*="LinkedIn"]',
        github:      '[name="githubUrl"],  [placeholder*="GitHub"]',
        coverLetter: 'textarea[name*="cover"], textarea[placeholder*="cover"]',
      },
    }[this.platform] || {};
  }

  // ── Wait for fields to appear (P3 fix) ───────────────────────────────────

  waitForFields(timeoutMs = JHOS_MAX_WAIT_MS) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        const fields = this.scanFormFields();
        if (fields.length > 0) { resolve(fields); return; }
        if (Date.now() > deadline) { resolve([]); return; }
        setTimeout(check, JHOS_POLL_MS);
      };
      check();
    });
  }

  // ── MutationObserver for multi-step forms (P6 fix) ───────────────────────

  watchForStepChanges(values) {
    this.cachedValues = values;

    this._observer = new MutationObserver(() => {
      // Debounce: wait for the DOM to settle before re-scanning
      clearTimeout(this._refillTimer);
      this._refillTimer = setTimeout(() => {
        const newFields = this.scanFormFields().filter(f => !f.element._jhos_filled);
        if (newFields.length > 0) {
          console.log(`[JobHuntOS] Step change detected — filling ${newFields.length} new fields`);
          for (const field of newFields) {
            const key = this.matchKey(field.label, field.name);
            if (key && this.cachedValues[key]) this.fillField(field.element, this.cachedValues[key]);
          }
          // Also re-run platform selectors for newly rendered fields
          this._fillPlatformSelectors(this.cachedValues);
        }
      }, JHOS_REFILL_DEBOUNCE);
    });

    // Watch for child list changes on the form container or body
    const formRoot = document.querySelector('form, main, [role="main"]') || document.body;
    this._observer.observe(formRoot, { childList: true, subtree: true });
  }

  stopWatching() {
    if (this._observer) { this._observer.disconnect(); this._observer = null; }
    clearTimeout(this._refillTimer);
  }

  // ── Internal: platform selectors fill ────────────────────────────────────

  _fillPlatformSelectors(values) {
    const selectors = this.platformSelectors();
    for (const [key, selector] of Object.entries(selectors)) {
      if (!values[key]) continue;
      // Try each comma-separated selector variant
      for (const s of selector.split(',').map(x => x.trim())) {
        try {
          // Try regular DOM first, then shadow DOM
          const el = document.querySelector(s) || querySelectorAllDeep(s)[0];
          if (el && !el._jhos_filled) { this.fillField(el, values[key]); break; }
        } catch { /* bad selector — skip */ }
      }
    }
  }

  // ── Main orchestrator ────────────────────────────────────────────────────

  async autofill(aiValues) {
    this.cachedValues = aiValues;

    // 1. Platform-specific known selectors
    this._fillPlatformSelectors(aiValues);

    // 2. Generic scan for remaining unfilled fields
    const fields = this.scanFormFields().filter(f => !f.element._jhos_filled);
    for (const field of fields) {
      const key = this.matchKey(field.label, field.name);
      if (key && aiValues[key]) this.fillField(field.element, aiValues[key]);
    }

    // 3. Watch for multi-step form transitions
    this.watchForStepChanges(aiValues);

    return this.filled.length;
  }

  // ── Undo ────────────────────────────────────────────────────────────────

  undo() {
    this.stopWatching();
    this.filled.forEach(({ element, originalValue }) => {
      try {
        this.fillText(element, originalValue);
        element.style.boxShadow = '';
        element._jhos_filled    = false;
      } catch { /* already removed from DOM */ }
    });
    this.filled       = [];
    this.cachedValues = null;
  }
}

// ── Auto-start: check storage for pending autofill on page load ───────────
// This runs when a new tab opens after the user clicked "Autofill Application"
// in the sidebar (P1 + P2 fix).

(async function checkPendingAutofill() {
  // Only run on likely ATS pages (not every page on the internet)
  const ATS_HOSTS = [
    'greenhouse.io', 'lever.co', 'linkedin.com', 'workday.com',
    'myworkdayjobs.com', 'icims.com', 'smartrecruiters.com',
    'jobvite.com', 'ashbyhq.com', 'indeed.com', 'ziprecruiter.com',
  ];
  const isAtsPage = ATS_HOSTS.some(h => window.location.hostname.includes(h));
  if (!isAtsPage) return;

  let payload;
  try {
    payload = await new Promise(resolve =>
      chrome.storage.local.get([JHOS_STORAGE_KEY], r => resolve(r[JHOS_STORAGE_KEY]))
    );
  } catch { return; }

  if (!payload?.autofillValues || !payload?.triggeredAt) return;

  // Expire after 10 minutes — prevents stale fills on unrelated pages
  if (Date.now() - payload.triggeredAt > 10 * 60 * 1000) {
    chrome.storage.local.remove(JHOS_STORAGE_KEY);
    return;
  }

  console.log('[JobHuntOS] Pending autofill found — waiting for form fields…');

  const autofiller = new JobHuntOSAutofill(payload.profileData, payload.analysisData);

  // Wait for fields to render (handles React/Angular lazy rendering — P3 fix)
  const fields = await autofiller.waitForFields();
  if (!fields.length) {
    console.warn('[JobHuntOS] No form fields found after waiting. Skipping auto-fill.');
    return;
  }

  // If the sidebar couldn't pre-generate values (cross-tab case), generate them now
  let autofillValues = payload.autofillValues;
  if (!autofillValues) {
    try {
      const res = await fetch('http://localhost:3000/api/generate-autofill', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile:  payload.profileData,
          jobAnalysis:  payload.analysisData,
          formFields:   fields.map(f => ({
            label:   f.label,
            type:    f.type,
            name:    f.name,
            options: f.options,
          })),
        }),
      });
      const data = await res.json();
      autofillValues = data.autofillValues || {};
    } catch (err) {
      console.error('[JobHuntOS] Failed to generate autofill values:', err.message);
      return;
    }
  }

  const count = await autofiller.autofill(autofillValues);
  console.log(`[JobHuntOS] Auto-filled ${count} fields on ${autofiller.platform}`);

  // Store autofiller on window so undo message handler can reach it
  window._jhosAutofiller = autofiller;

  // Show a toast notification
  showAutofillToast(count, autofiller.platform);

  // Clear the pending payload so it doesn't re-fire on next navigation
  chrome.storage.local.remove(JHOS_STORAGE_KEY);
})();

// ── Toast notification ────────────────────────────────────────────────────

function showAutofillToast(count, platform) {
  // Remove any existing toast
  document.getElementById('jhos-toast')?.remove();

  const toast = document.createElement('div');
  toast.id = 'jhos-toast';
  Object.assign(toast.style, {
    position:       'fixed',
    top:            '16px',
    right:          '420px', // sit to the left of the sidebar
    zIndex:         '2147483646',
    background:     'linear-gradient(135deg, #1a1a2e, #1e1e35)',
    border:         '1px solid rgba(124,106,247,0.4)',
    borderRadius:   '10px',
    padding:        '12px 16px',
    color:          '#e8e8f0',
    fontFamily:     '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize:       '13px',
    boxShadow:      '0 8px 24px rgba(0,0,0,0.5)',
    minWidth:       '220px',
    transition:     'opacity 0.4s',
    opacity:        '0',
    pointerEvents:  'none',
  });

  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:16px">⚡</span>
      <div>
        <div style="font-weight:600;color:#00d4aa">${count} fields filled</div>
        <div style="font-size:11px;color:#7878a0;margin-top:2px">Platform: ${platform} · Review before submitting</div>
      </div>
    </div>
  `;

  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
