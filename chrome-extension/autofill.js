/* JobHuntOS Autofill — injected into job application pages */
/* eslint-disable no-unused-vars */

class JobHuntOSAutofill {
  constructor(profileData, analysisData) {
    this.profile   = profileData  || '';
    this.analysis  = analysisData || {};
    this.filled    = []; // { element, originalValue }
    this.platform  = this.detectPlatform();
  }

  detectPlatform() {
    const h = window.location.hostname;
    if (h.includes('linkedin.com'))                             return 'linkedin';
    if (h.includes('greenhouse.io'))                           return 'greenhouse';
    if (h.includes('lever.co'))                                return 'lever';
    if (h.includes('workday.com') || h.includes('myworkdayjobs.com')) return 'workday';
    if (h.includes('icims.com'))                               return 'icims';
    if (h.includes('smartrecruiters.com'))                     return 'smartrecruiters';
    if (h.includes('jobvite.com'))                             return 'jobvite';
    if (h.includes('ashbyhq.com'))                             return 'ashby';
    return 'generic';
  }

  // ── Safety check ────────────────────────────────────────────────────────────

  isSafeField(el) {
    const name        = (el.name        || '').toLowerCase();
    const id          = (el.id          || '').toLowerCase();
    const type        = (el.type        || '').toLowerCase();
    const placeholder = (el.placeholder || '').toLowerCase();
    const combined    = name + ' ' + id + ' ' + placeholder;

    const BLOCKED = [
      'password', 'passwd', 'secret', 'token', 'login', 'signin',
      'credit', 'card', 'cvv', 'cvc', 'expiry', 'billing', 'payment',
      'ssn', 'social.?security', 'bank', 'routing', 'account.?number',
    ];
    return !BLOCKED.some(p => new RegExp(p).test(combined)) && type !== 'password';
  }

  // ── Field scanning ──────────────────────────────────────────────────────────

  scanFormFields() {
    const seen   = new Set();
    const fields = [];

    document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="file"]):not([type="password"]), textarea, select'
    ).forEach(el => {
      if (!this.isSafeField(el)) return;
      const key = el.name || el.id || el.getAttribute('data-field');
      if (key && seen.has(key)) return;
      if (key) seen.add(key);

      const label = this.resolveLabel(el);
      if (!label && !el.name && !el.id) return;

      fields.push({
        element: el,
        label:   label,
        type:    el.type || el.tagName.toLowerCase(),
        name:    el.name || el.id || '',
        options: el.tagName === 'SELECT'
          ? Array.from(el.options).map(o => o.text).filter(t => t.trim())
          : [],
      });
    });

    return fields;
  }

  resolveLabel(el) {
    // 1. <label for="id">
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) return lbl.innerText.replace(/\*/g, '').trim();
    }
    // 2. Wrapping <label>
    const wrap = el.closest('label');
    if (wrap) return wrap.innerText.replace(/\*/g, '').trim().slice(0, 120);
    // 3. aria-label / aria-labelledby
    const aria = el.getAttribute('aria-label');
    if (aria) return aria.trim();
    const lbid = el.getAttribute('aria-labelledby');
    if (lbid) {
      const lbEl = document.getElementById(lbid);
      if (lbEl) return lbEl.innerText.trim();
    }
    // 4. placeholder
    if (el.placeholder) return el.placeholder.trim();
    // 5. Nearest preceding text node / sibling
    const parent = el.parentElement;
    if (parent) {
      const text = parent.querySelector('span, p, label, legend, div > strong');
      if (text && text !== el) return text.innerText.trim().slice(0, 120);
    }
    return el.name || el.id || '';
  }

  // ── Field → semantic key ────────────────────────────────────────────────────

  matchKey(label, name) {
    const t = (label + ' ' + name).toLowerCase();

    if (/first.?name|given.?name/.test(t))                 return 'firstName';
    if (/last.?name|family.?name|surname/.test(t))         return 'lastName';
    if (/full.?name|your.?name|^name$/.test(t))            return 'fullName';
    if (/\bemail\b/.test(t))                               return 'email';
    if (/\bphone\b|\bmobile\b|\bcell\b/.test(t))           return 'phone';
    if (/linkedin/.test(t))                                return 'linkedin';
    if (/github/.test(t))                                  return 'github';
    if (/portfolio|personal.?site/.test(t))                return 'portfolio';
    if (/\bcity\b/.test(t))                                return 'city';
    if (/\bstate\b|\bprovince\b/.test(t))                  return 'state';
    if (/zip|postal/.test(t))                              return 'zip';
    if (/\bcountry\b/.test(t))                             return 'country';
    if (/salary|compensation|expected.?pay/.test(t))       return 'salary';
    if (/degree|education.?level/.test(t))                 return 'degree';
    if (/university|college|school/.test(t))               return 'university';
    if (/\bmajor\b|field.?of.?study/.test(t))              return 'major';
    if (/\bgpa\b|\bgrade\b/.test(t))                       return 'gpa';
    if (/grad.*year|graduation/.test(t))                   return 'gradYear';
    if (/years?.?of.?exp|experience.?years/.test(t))       return 'yearsExp';
    if (/current.?title|job.?title|position.?title/.test(t)) return 'currentTitle';
    if (/current.?company|employer/.test(t))               return 'currentCompany';
    if (/cover.?letter/.test(t))                           return 'coverLetter';
    if (/why.*(company|us|role|position|join|want)/.test(t)) return 'whyCompany';
    if (/tell.*about.*yourself|about.?you|intro/.test(t))  return 'aboutYourself';
    if (/authorized|eligible.*work|work.*auth/.test(t))    return 'workAuth';
    if (/sponsor|require.*visa/.test(t))                   return 'sponsorship';
    if (/\bskills\b|technologies|tech.?stack/.test(t))     return 'skills';
    if (/greatest.?strength|top.?strength/.test(t))        return 'strength';
    if (/challenge|difficult|obstacle/.test(t))            return 'challenge';
    if (/achievement|proud|accomplish/.test(t))            return 'achievement';
    if (/available|start.?date|when.*start/.test(t))       return 'startDate';
    if (/remote|work.?from.?home|hybrid/.test(t))          return 'workType';
    if (/how.*hear|refer|source/.test(t))                  return 'referralSource';
    return null;
  }

  // ── Fill primitives ─────────────────────────────────────────────────────────

  fillText(el, value) {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    el.dispatchEvent(new Event('blur',   { bubbles: true }));
  }

  fillSelect(el, value) {
    const opts  = Array.from(el.options);
    const lower = String(value).toLowerCase();
    const match = opts.find(o =>
      o.text.toLowerCase()  === lower ||
      o.value.toLowerCase() === lower ||
      o.text.toLowerCase().includes(lower) ||
      lower.includes(o.text.toLowerCase())
    );
    if (match) {
      el.value = match.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  fillCheckbox(el, value) {
    const want = value === true || /^yes|true|1$/i.test(String(value));
    if (el.checked !== want) el.click();
  }

  fillRadio(el, value) {
    const group = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`);
    const lower = String(value).toLowerCase();
    group.forEach(r => {
      const lbl = document.querySelector(`label[for="${CSS.escape(r.id)}"]`);
      const txt = (lbl?.innerText || r.value || '').toLowerCase();
      if (txt.includes(lower) || lower.includes(r.value.toLowerCase())) r.click();
    });
  }

  fillField(el, value) {
    if (!value || value === 'SKIP' || !this.isSafeField(el)) return false;
    const originalValue = el.value;
    try {
      const tag  = el.tagName.toLowerCase();
      const type = (el.type || '').toLowerCase();
      if (tag === 'select')             this.fillSelect(el, value);
      else if (type === 'checkbox')     this.fillCheckbox(el, value);
      else if (type === 'radio')        this.fillRadio(el, value);
      else if (type === 'file')         return false;
      else                              this.fillText(el, value);

      // Track for undo
      this.filled.push({ element: el, originalValue });

      // Subtle highlight
      el.style.transition  = 'box-shadow 0.3s';
      el.style.boxShadow   = 'inset 0 0 0 2px rgba(124,106,247,0.6)';
      setTimeout(() => { el.style.boxShadow = ''; }, 2000);

      el._jhos_filled = true;
      return true;
    } catch (err) {
      console.warn('[JobHuntOS Autofill] Could not fill', el, err);
      return false;
    }
  }

  // ── Platform-specific direct selectors ──────────────────────────────────────

  platformSelectors() {
    const map = {
      greenhouse: {
        firstName:   '#first_name',
        lastName:    '#last_name',
        email:       '#email',
        phone:       '#phone',
        linkedin:    '[id*="linkedin"]',
        github:      '[id*="github"]',
        portfolio:   '[id*="website"]',
        coverLetter: '#cover_letter_text',
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
        firstName:   '[name="firstName"], [id*="first-name"]',
        lastName:    '[name="lastName"],  [id*="last-name"]',
        email:       '[name="email"]',
        phone:       '[name="phoneNumber"]',
        coverLetter: 'textarea[id*="cover"], textarea[name*="cover"]',
      },
    };
    return map[this.platform] || {};
  }

  // ── Main orchestrator ────────────────────────────────────────────────────────

  async autofill(aiValues) {
    // 1. Platform-specific
    const selectors = this.platformSelectors();
    for (const [key, selector] of Object.entries(selectors)) {
      if (!aiValues[key]) continue;
      try {
        const el = document.querySelector(selector);
        if (el && !el._jhos_filled) this.fillField(el, aiValues[key]);
      } catch { /* bad selector — skip */ }
    }

    // 2. Generic scan for remaining unfilled fields
    const fields = this.scanFormFields().filter(f => !f.element._jhos_filled);
    for (const field of fields) {
      const key = this.matchKey(field.label, field.name);
      if (key && aiValues[key]) this.fillField(field.element, aiValues[key]);
    }

    return this.filled.length;
  }

  // ── Undo ─────────────────────────────────────────────────────────────────────

  undo() {
    this.filled.forEach(({ element, originalValue }) => {
      try {
        this.fillText(element, originalValue);
        element.style.boxShadow = '';
        element._jhos_filled    = false;
      } catch { /* ignore */ }
    });
    this.filled = [];
  }
}
