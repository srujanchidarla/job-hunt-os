import { Router } from "express";
import { scrapeJobPage } from "../services/scraper.js";
import { analyzeWithClaude, humanizeContent, generateSummary, parseProfile } from "../services/claude.js";
import { saveToNotion } from "../services/notion.js";
import { buildNotionBlocks, buildDocx } from "../services/resume.js";
import { Client as NotionClient } from "@notionhq/client";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";

const router = Router();

// ── In-memory cache (5 min TTL) ──────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCached(key, data) {
  // Evict oldest entries if cache grows large
  if (cache.size >= 50) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    cache.delete(oldest);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

function cacheKey(url, rawText) {
  return url || rawText.slice(0, 120);
}

// ── SSE helpers ──────────────────────────────────────────────────────────────
function sseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
}

function send(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// ── POST /api/analyze-stream  (SSE — primary endpoint) ──────────────────────
router.post("/analyze-stream", async (req, res) => {
  sseHeaders(res);

  const { url, rawText, userProfile } = req.body;

  if (!url && !rawText) {
    send(res, { type: 'error', message: 'url or rawText is required' });
    return res.end();
  }
  if (!userProfile) {
    send(res, { type: 'error', message: 'No profile found. Please set up your profile first.' });
    return res.end();
  }

  try {
    // ── Check cache ──────────────────────────────────────────────────────────
    const key = cacheKey(url, rawText || '');
    const cached = getCached(key);
    if (cached) {
      send(res, { type: 'tier1', data: cached.tier1, cached: true });
      send(res, { type: 'tier2', data: cached.tier2, cached: true });
      send(res, { type: 'done' });
      return res.end();
    }

    // ── Step 1: scrape (or use provided text) ────────────────────────────────
    const jobText = rawText || (await scrapeJobPage(url));
    const cleanText = jobText.slice(0, 3000);
    send(res, { type: 'scraping_done' });

    // ── Step 2: Tier 1 — fast (fit score, bullets, gap, keywords) ───────────
    const tier1 = await analyzeWithClaude(cleanText, url || '', userProfile, 1);
    send(res, { type: 'tier1', data: tier1 });

    // ── Step 3: Tier 2 — ATS + outreach (runs after tier1 is already shown) ─
    const tier2 = await analyzeWithClaude(cleanText, url || '', userProfile, 2);
    send(res, { type: 'tier2', data: tier2 });

    // ── Cache the combined result ────────────────────────────────────────────
    setCached(key, { tier1, tier2 });

    send(res, { type: 'done' });
    res.end();

  } catch (err) {
    console.error("analyze-stream error:", err.message);
    send(res, { type: 'error', message: err.message });
    res.end();
  }
});

// ── POST /api/analyze  (legacy single-call fallback) ────────────────────────
router.post("/analyze", async (req, res) => {
  const { url, rawText, userProfile } = req.body;

  if (!url && !rawText) return res.status(400).json({ error: "url or rawText is required" });
  if (!userProfile)      return res.status(400).json({ error: "No profile found. Please set up your profile first." });

  try {
    const key = cacheKey(url, rawText || '');
    const cached = getCached(key);
    if (cached) return res.json({ ...cached.tier1, ...cached.tier2, cached: true });

    const jobText   = rawText || (await scrapeJobPage(url));
    const cleanText = jobText.slice(0, 3000);

    const [tier1, tier2] = await Promise.all([
      analyzeWithClaude(cleanText, url || '', userProfile, 1),
      analyzeWithClaude(cleanText, url || '', userProfile, 2),
    ]);

    const analysis = { ...tier1, ...tier2 };
    setCached(key, { tier1, tier2 });
    return res.json(analysis);
  } catch (err) {
    console.error("analyze error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/parse-profile ──────────────────────────────────────────────────
router.post("/parse-profile", async (req, res) => {
  const { text, fileBase64, fileType } = req.body;

  try {
    let rawText = "";

    if (fileBase64) {
      const buf = Buffer.from(fileBase64, "base64");
      if (fileType === "pdf") {
        const result = await pdfParse(buf);
        rawText = result.text;
      } else if (fileType === "docx") {
        const result = await mammoth.extractRawText({ buffer: buf });
        rawText = result.value;
      } else {
        return res.status(400).json({ error: "fileType must be 'pdf' or 'docx'" });
      }
    } else if (text) {
      rawText = text;
    } else {
      return res.status(400).json({ error: "text or fileBase64 is required" });
    }

    if (rawText.trim().length < 50) {
      return res.status(400).json({ error: "Could not extract text from file. Try pasting your resume instead." });
    }

    const parsedProfile = await parseProfile(rawText);
    return res.json({ parsedProfile });
  } catch (err) {
    console.error("parse-profile error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/save  (user-initiated — always awaited) ───────────────────────
router.post("/save", async (req, res) => {
  const { url, ...analysis } = req.body;

  if (!analysis.role && !analysis.company) {
    return res.status(400).json({ error: "analysis data is required" });
  }

  try {
    const result = await saveToNotion(analysis, url || "");
    return res.json({ notionUrl: result.url, notionPageId: result.id });
  } catch (err) {
    console.error("save error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/humanize ───────────────────────────────────────────────────────
router.post("/humanize", async (req, res) => {
  const { bullets, outreachMessage, jobDescription } = req.body;

  if (!Array.isArray(bullets) || !outreachMessage) {
    return res.status(400).json({ error: "bullets and outreachMessage are required" });
  }

  try {
    const result = await humanizeContent({
      bullets,
      outreachMessage,
      jobDescription: jobDescription || "",
    });
    return res.json(result);
  } catch (err) {
    console.error("humanize error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/generate-resume ────────────────────────────────────────────────
router.post("/generate-resume", async (req, res) => {
  const { notionPageId, analysis, jobTitle, company } = req.body;

  if (!analysis || !notionPageId) {
    return res.status(400).json({ error: "notionPageId and analysis are required" });
  }

  try {
    const summary = await generateSummary({
      fitReasoning: analysis.fitReasoning || "",
      topKeywords:  analysis.topKeywords  || [],
      role:         jobTitle || analysis.role || "Software Engineer",
      company:      company  || analysis.company || "the company",
    });

    const notion = new NotionClient({ auth: process.env.NOTION_API_KEY });
    const blocks = buildNotionBlocks(analysis, summary);

    const childPage = await notion.pages.create({
      parent: { page_id: notionPageId },
      properties: {
        title: {
          title: [{ text: { content: `Resume — ${jobTitle || analysis.role} @ ${company || analysis.company}` } }],
        },
      },
      children: blocks,
    });

    const docxBase64 = await buildDocx(analysis, summary);

    return res.json({
      notionResumeUrl: childPage.url,
      docxBase64,
      filename: `Resume_${(jobTitle || analysis.role || "Resume").replace(/\s+/g, "_")}_${(company || analysis.company || "").replace(/\s+/g, "_")}.docx`,
    });
  } catch (err) {
    console.error("generate-resume error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/generate-autofill ─────────────────────────────────────────────
router.post("/generate-autofill", async (req, res) => {
  const { userProfile, jobAnalysis, formFields } = req.body;

  if (!userProfile || !formFields?.length) {
    return res.status(400).json({ error: "userProfile and formFields are required" });
  }

  const { company = '', role = '', fitScore = 0, resumeBullets = [], topKeywords = [] } = jobAnalysis || {};

  // Build a concise field list for the prompt
  const fieldList = formFields.map(f => {
    let desc = `"${f.label}" (${f.type}${f.name ? ', name=' + f.name : ''})`;
    if (f.options?.length) desc += ` options: [${f.options.slice(0, 8).join(', ')}]`;
    return desc;
  }).join('\n');

  const prompt = `You are filling a job application form for ${role} at ${company}.

Candidate profile:
${String(userProfile).slice(0, 500)}

Job context: Fit score ${fitScore}/100. Keywords: ${topKeywords.join(', ')}.
Tailored bullets:
${resumeBullets.map(b => `- ${b}`).join('\n')}

Form fields to fill:
${fieldList}

Rules:
- coverLetter: 3 short paragraphs tailored to ${company}, use their keywords, mention specific metrics, sound human
- whyCompany/aboutYourself: 2-3 sentences specific to ${company}'s mission
- workAuth: "Yes" if US-authorized profile, else "SKIP"
- sponsorship: "No" if authorized, else "SKIP"
- salary/expectedSalary: "Negotiable"
- referralSource: "Online Job Board"
- startDate: "2 weeks notice" or "Immediately"
- workType: extract from profile or "Open to all"
- For fields you cannot reasonably fill, return "SKIP"
- Extract phone/email/linkedin/github/gpa/degree/university from profile text

Return ONLY a JSON object (no markdown, no explanation):
{
  "firstName": "...",
  "lastName": "...",
  "fullName": "...",
  "email": "...",
  "phone": "...",
  "linkedin": "...",
  "github": "...",
  "portfolio": "...",
  "city": "...",
  "state": "...",
  "country": "US",
  "degree": "...",
  "university": "...",
  "major": "...",
  "gpa": "...",
  "gradYear": "...",
  "yearsExp": "...",
  "currentTitle": "...",
  "currentCompany": "...",
  "salary": "Negotiable",
  "workAuth": "Yes",
  "sponsorship": "No",
  "coverLetter": "...",
  "whyCompany": "...",
  "aboutYourself": "...",
  "skills": "...",
  "strength": "...",
  "startDate": "2 weeks notice",
  "referralSource": "Online Job Board"
}`;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client    = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw  = message.content[0]?.text?.trim() || '{}';
    const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let autofillValues;
    try {
      autofillValues = JSON.parse(json);
    } catch {
      // Try to extract the first {...} block
      const match = json.match(/\{[\s\S]*\}/);
      autofillValues = match ? JSON.parse(match[0]) : {};
    }

    return res.json({ autofillValues });
  } catch (err) {
    console.error("generate-autofill error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
