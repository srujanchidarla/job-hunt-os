import axios from 'axios';
import * as cheerio from 'cheerio';

const TIMEOUT_MS = 15000;
const JD_CAP = 3000;

// Words that indicate relevant job description content
const JD_SIGNALS = /required|responsibilities|qualifications|experience|skills|you will|we need|requirements|must.have|you.ll|preferred|duties|what you|who you/i;

const SELECTORS = [
  // Greenhouse
  '.job__description',
  // Lever
  '.posting-page',
  // LinkedIn
  '.description__text',
  '.show-more-less-html__markup',
  // Indeed
  '#jobDescriptionText',
  // Workday
  '[data-automation-id="jobPostingDescription"]',
  // Generic fallbacks
  'main',
  'article',
  '[class*="job-description"]',
  '[class*="jobDescription"]',
  '[id*="job-description"]',
  '[id*="jobDescription"]',
];

function smartTrim(text, cap) {
  // Split into paragraphs, keep only those with JD signals or that are short headers
  const paragraphs = text.split(/\n{2,}|\.\s{2,}/);
  const relevant = paragraphs.filter(p => {
    const t = p.trim();
    return t.length > 0 && (JD_SIGNALS.test(t) || t.length < 120);
  });

  // Join and cap
  const joined = relevant.length > 2
    ? relevant.join('\n').replace(/\s{2,}/g, ' ').trim()
    : text.replace(/\s{2,}/g, ' ').trim();

  return joined.slice(0, cap);
}

export async function scrapeJobPage(url) {
  const response = await axios.get(url, {
    timeout: TIMEOUT_MS,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  const $ = cheerio.load(response.data);
  $('script, style, nav, footer, header, [role="banner"], [role="navigation"]').remove();

  for (const selector of SELECTORS) {
    const el = $(selector).first();
    if (el.length) {
      const text = el.text().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      if (text.length > 200) return smartTrim(text, JD_CAP);
    }
  }

  const bodyText = $('body').text().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (bodyText.length < 100) {
    throw new Error('Could not extract job description from page');
  }
  return smartTrim(bodyText, JD_CAP);
}
