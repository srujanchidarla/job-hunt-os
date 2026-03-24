import Anthropic from '@anthropic-ai/sdk';

let client;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
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
    model: 'claude-sonnet-4-5',
    max_tokens: maxTok,
    system: `Career coach AI. Analyze job fit for this candidate:
${userProfile}

Return JSON only, no markdown. ${tierNote}`,
    messages: [{
      role: 'user',
      content: `Job${url ? ` (${url})` : ''}:\n${jobText}\n\nSchema:\n${schema}`,
    }],
  });

  const raw = message.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, ''));
  }
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
    model: 'claude-sonnet-4-5',
    max_tokens: 1000,
    system: HUMANIZE_SYSTEM,
    messages: [{
      role: 'user',
      content: `JD context:\n${jobDescription.slice(0, 800)}\n\nBullets:\n${bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}\n\nOutreach:\n${outreachMessage}`,
    }],
  });

  const raw = message.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, ''));
  }
}

export async function generateSummary({ fitReasoning, topKeywords, role, company }) {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `3-sentence resume summary for ${role} at ${company}. Context: ${fitReasoning}. Skills: ${(topKeywords || []).join(', ')}. First-person implied, active voice, no buzzwords, plain text.`,
    }],
  });
  return message.content[0].text.trim();
}

export async function parseProfile(rawText) {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Extract and structure this resume into clean plain text for job matching. Include: name, contact, all work experience (company/role/dates/bullets with exact metrics), skills, projects, education, GPA, certifications. Preserve every number/percentage exactly.\n\n${rawText.slice(0, 8000)}`,
    }],
  });
  return message.content[0].text.trim();
}
