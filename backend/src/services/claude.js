import Anthropic from '@anthropic-ai/sdk';

let client;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// Safely parse JSON from Claude responses.
// Claude sometimes wraps output in ```json fences, adds trailing commas,
// or truncates at max_tokens. This function handles all known variants.
function safeParseJSON(raw, label = 'claude') {
  if (!raw) throw new Error(`${label}: empty response`)
  let text = raw.trim()

  // Strip ```json ... ``` or ``` ... ``` fences (any whitespace variant)
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  // Attempt 1: direct parse
  try { return JSON.parse(text) } catch (e1) {
    // Attempt 2: extract first complete {...} block (handles preamble text)
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* fall through */ }
    }

    // Attempt 3: truncated JSON — find last complete top-level field
    const lastBrace = text.lastIndexOf('}')
    if (lastBrace > 0) {
      try { return JSON.parse(text.slice(0, lastBrace + 1)) } catch { /* fall through */ }
    }

    console.error(`safeParseJSON(${label}) failed. e1: ${e1.message}. Raw (first 300):`, text.slice(0, 300))
    throw new Error(`${label}: could not parse Claude JSON response — ${e1.message}`)
  }
}

export const AI_BUZZWORDS = ['leverage', 'utilize', 'synergy', 'spearheaded', 'orchestrated',
  'deliverables', 'robust', 'innovative', 'cutting-edge', 'scalable', 'streamline',
  'holistic', 'paradigm', 'ecosystem', 'empower', 'transformative'];

// Tier 1 — fit score, bullets, skills gap, keywords (~4s, 600 tokens)
const TIER1_SCHEMA = `{
  "company": "string",
  "role": "string",
  "fitScore": 0-100,
  "fitReasoning": "2 sentences max",
  "resumeBullets": ["bullet1 (action verb + metric, max 20 words)", "bullet2", "bullet3"],
  "skillsGap": ["skill1", "skill2", "skill3", "skill4"],
  "topKeywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}`;

// Tier 2 — ATS analysis + outreach (~4s, 900 tokens)
const TIER2_SCHEMA = `{
  "outreachMessage": "LinkedIn DM, 3-4 sentences, personalized to role/company",
  "atsScore": {
    "overall": 0-100,
    "keyword": 0-100,
    "format": 0-100,
    "human": 0-100,
    "breakdown": {
      "keywordsFound": ["kw1", "kw2"],
      "keywordsMissing": ["kw1", "kw2"],
      "aiWords": ["word1"],
      "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
    }
  }
}`;

export async function analyzeWithClaude(jobText, url, userProfile, tier) {
  const schema   = tier === 1 ? TIER1_SCHEMA : TIER2_SCHEMA;
  const maxTok   = tier === 1 ? 600 : 900;
  const tierNote = tier === 1
    ? 'Focus: fit score, resume bullets, skills gap, keywords.'
    : `Focus: ATS analysis (keyword 40% + format 30% + human 30% weighted; penalize AI buzzwords: ${AI_BUZZWORDS.slice(0,6).join(', ')}...) and outreach message.`;

  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTok,
    system: [
      {
        type: 'text',
        text: `Career coach AI. Analyze job fit for this candidate:\n${userProfile}\n\nReturn JSON only, no markdown. ${tierNote}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{
      role: 'user',
      content: `Job${url ? ` (${url})` : ''}:\n${jobText}\n\nSchema:\n${schema}`,
    }],
  });

  const raw = message.content[0].text.trim();
  return safeParseJSON(raw, `analyzeWithClaude tier${tier}`)
}

// Legacy single-call kept for /api/analyze fallback
export async function analyzeJob(jobText, url, userProfile) {
  return analyzeWithClaude(jobText, url, userProfile, 1);
}

const HUMANIZE_SYSTEM = `Expert resume writer. Make AI content sound naturally human.
Rules: keep ALL metrics exactly. Vary sentence structure. Active voice. Strong specific verbs (built, shipped, cut, grew).
Never use: leverage, utilize, synergy, spearheaded, orchestrated, deliverables, robust, innovative, cutting-edge, empower, transformative.
Write like an engineer talking to an engineer.
JSON only: {"humanizedBullets":["b1","b2","b3"],"humanizedOutreach":"text","newHumanScore":0-100}`;

export async function humanizeContent({ bullets, outreachMessage, jobDescription }) {
  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: [
      {
        type: 'text',
        text: HUMANIZE_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{
      role: 'user',
      content: `JD context:\n${jobDescription.slice(0, 800)}\n\nBullets:\n${bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}\n\nOutreach:\n${outreachMessage}`,
    }],
  });

  const raw = message.content[0].text.trim();
  return safeParseJSON(raw, 'humanizeContent')
}

export async function generateSummary({ fitReasoning, topKeywords, role, company }) {
  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `3-sentence resume summary for ${role} at ${company}. Context: ${fitReasoning}. Skills: ${(topKeywords || []).join(', ')}. First-person implied, active voice, no buzzwords, plain text.`,
          cache_control: { type: 'ephemeral' },
        },
      ],
    }],
  });
  return message.content[0].text.trim();
}

export async function parseProfile(rawText) {
  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: [
      {
        type: 'text',
        text: 'You are a resume parser. Extract and structure resumes into clean plain text for job matching.',
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Extract and structure this resume into clean plain text for job matching. Include: name, contact, all work experience (company/role/dates/bullets with exact metrics), skills, projects, education, GPA, certifications. Preserve every number/percentage exactly.\n\n${rawText.slice(0, 8000)}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
    }],
  });
  return message.content[0].text.trim();
}

const PROFILE_SCHEMA = `{
  "personal": {
    "firstName": "", "lastName": "", "fullName": "",
    "email": "", "phone": "", "city": "", "state": "", "country": "", "zip": "",
    "linkedinUrl": "", "githubUrl": "", "portfolioUrl": ""
  },
  "currentRole": { "title": "", "company": "" },
  "workExperience": [
    { "title": "", "company": "", "location": "", "startDate": "", "endDate": "", "current": false, "type": "", "bullets": [], "description": "" }
  ],
  "education": [
    { "school": "", "degree": "", "major": "", "startDate": "", "endDate": "", "gpa": "" }
  ],
  "projects": [
    { "name": "", "description": "", "url": "", "technologies": [] }
  ],
  "skills": [],
  "languages": [],
  "jobPreferences": {
    "desiredRole": "", "desiredSalary": "", "workType": "", "yearsOfExperience": "", "searchStatus": ""
  },
  "workAuthorization": { "authorizedInUS": true, "requiresSponsorship": false },
  "rawText": ""
}`;

export async function parseProfileStructured(rawText) {
  const message = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    system: [
      {
        type: 'text',
        text: 'You are a resume parser. Extract all information into the exact JSON schema provided. Return ONLY valid JSON, no markdown, no explanation. Use empty string for missing string fields, empty array for missing array fields.',
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{
      role: 'user',
      content: `Extract all information from this resume/profile text into the JSON schema below. Keep bullet points concise (max 120 chars each). Limit to 5 bullets per job. Limit skills array to 30 items. Set rawText to empty string.\n\nSchema:\n${PROFILE_SCHEMA}\n\nInput:\n${rawText.slice(0, 6000)}`,
    }],
  });

  const raw = message.content[0].text.trim();
  try {
    return safeParseJSON(raw, 'parseProfileStructured')
  } catch {
    // Last resort: return a minimal valid profile so setup doesn't break
    console.error('parseProfileStructured: returning empty profile fallback')
    return { personal:{}, workExperience:[], education:[], skills:[], projects:[], languages:[], jobPreferences:{}, workAuthorization:{ authorizedInUS:true, requiresSponsorship:false }, rawText:'' }
  }
}
