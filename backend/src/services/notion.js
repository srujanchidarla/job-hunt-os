import { Client } from '@notionhq/client';

let notion;
function getNotion() {
  if (!notion) notion = new Client({ auth: process.env.NOTION_API_KEY });
  return notion;
}
const DATABASE_ID = () => process.env.NOTION_DATABASE_ID;

function txt(value) {
  return [{ text: { content: String(value ?? '').slice(0, 2000) } }];
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function arr(value, sep = ', ') {
  return Array.isArray(value) ? value.join(sep) : String(value ?? '');
}

export async function saveToNotion(analysis, jobUrl) {
  const {
    company, role, fitScore, fitReasoning,
    skillsGap, outreachMessage, resumeBullets, topKeywords,
    atsScore, humanized,
  } = analysis;

  const ats = atsScore || {};
  const breakdown = ats.breakdown || {};

  const response = await getNotion().pages.create({
    parent: { database_id: DATABASE_ID() },
    properties: {
      // ── Existing columns ──
      Role:             { title: txt(role || 'Unknown Role') },
      Company:          { rich_text: txt(company || 'Unknown Company') },
      URL:              { url: jobUrl || null },
      'Fit Score':      { number: num(fitScore) },
      Status:           { select: { name: 'To Apply' } },
      'Date Added':     { date: { start: new Date().toISOString().split('T')[0] } },
      'Skills Gap':     { rich_text: txt(arr(skillsGap)) },
      'Outreach Draft': { rich_text: txt(outreachMessage || '') },
      'Resume Bullets': { rich_text: txt(arr(resumeBullets, '\n')) },

      // ── New columns ──
      'ATS Score':        { number: num(ats.overall) },
      'Keyword Score':    { number: num(ats.keyword) },
      'Human Score':      { number: num(ats.human) },
      'Keywords Found':   { rich_text: txt(arr(breakdown.keywordsFound)) },
      'Keywords Missing': { rich_text: txt(arr(breakdown.keywordsMissing)) },
      'Top Keywords':     { rich_text: txt(arr(topKeywords)) },
      'Fit Reasoning':    { rich_text: txt(fitReasoning || '') },
      'ATS Suggestions':  { rich_text: txt(arr(breakdown.suggestions, '\n')) },
      'Humanized':        { checkbox: !!humanized },
    },
  });

  return { id: response.id, url: response.url };
}
