import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, convertInchesToTwip,
} from 'docx';

// ── Candidate constants ──
const CANDIDATE = {
  name:    'SRUJAN CHIDARLA',
  contact: 'srujanchidarla.uof@gmail.com  |  linkedin.com/in/srujanchidarla  |  github.com/srujanchidarla  |  +1 (201) 884-4724',
  cognizantBullets: [
    'Engineered Spring Boot microservices handling 2M+ daily requests at 99.9% uptime serving 500+ enterprise users',
    'Reduced page load times 30% by revamping Angular frontend with component-based architecture and lazy loading',
    'Improved team productivity 20% by integrating Azure DevOps APIs for automated sprint synchronization',
  ],
  projects: [
    'AlgoChronicle — Automated CI/CD pipeline with GitHub Webhooks and Firebase Firestore for real-time algorithm tracking',
    'StudyGlobal — Next.js platform serving 2,000+ users with 35% engagement increase through personalized learning paths',
    'SportsFusion — React/Node.js booking platform achieving 60% booking increase through optimized UX',
  ],
  education: [
    { degree: 'M.S. Computer Science, GPA 4.0/4.0', school: 'University of Fairfax', dates: 'Aug 2024 – Aug 2026' },
    { degree: 'B.Tech Information Technology, GPA 3.8/4.0', school: 'VNR VJIET', dates: 'Aug 2018 – Aug 2021' },
  ],
  fullStack: 'Java, JavaScript, TypeScript, Python, React, Next.js, Angular, Spring Boot, Node.js, AWS, Docker, Kubernetes, MongoDB, MySQL, PostgreSQL',
};

// ── Helper: reorder skills putting JD keywords first ──
function buildSkillsLine(topKeywords = []) {
  const base = CANDIDATE.fullStack.split(', ');
  const kwLower = topKeywords.map(k => k.toLowerCase());
  const front = base.filter(s => kwLower.some(k => s.toLowerCase().includes(k)));
  const rest   = base.filter(s => !kwLower.some(k => s.toLowerCase().includes(k)));
  return [...new Set([...front, ...rest])].join(', ');
}

// ── Notion blocks ──

function notionRichText(text, bold = false) {
  return [{ type: 'text', text: { content: text }, annotations: { bold } }];
}

export function buildNotionBlocks(analysis, summary) {
  const { resumeBullets = [], topKeywords = [] } = analysis;
  const skillsLine = buildSkillsLine(topKeywords);

  return [
    // Name
    { object: 'block', type: 'heading_1', heading_1: { rich_text: notionRichText(CANDIDATE.name) } },
    // Contact
    { object: 'block', type: 'paragraph', paragraph: { rich_text: notionRichText(CANDIDATE.contact) } },
    { object: 'block', type: 'divider', divider: {} },

    // Summary
    { object: 'block', type: 'heading_2', heading_2: { rich_text: notionRichText('PROFESSIONAL SUMMARY') } },
    { object: 'block', type: 'paragraph', paragraph: { rich_text: notionRichText(summary) } },
    { object: 'block', type: 'divider', divider: {} },

    // Skills
    { object: 'block', type: 'heading_2', heading_2: { rich_text: notionRichText('TECHNICAL SKILLS') } },
    { object: 'block', type: 'paragraph', paragraph: { rich_text: notionRichText(skillsLine) } },
    { object: 'block', type: 'divider', divider: {} },

    // Experience
    { object: 'block', type: 'heading_2', heading_2: { rich_text: notionRichText('PROFESSIONAL EXPERIENCE') } },
    {
      object: 'block', type: 'heading_3', heading_3: {
        rich_text: [
          { type: 'text', text: { content: 'Full Stack Web Developer Intern' }, annotations: { bold: true } },
          { type: 'text', text: { content: '  |  WalletGyde  |  Dec 2024 – May 2025' } },
        ],
      },
    },
    ...resumeBullets.map(b => ({
      object: 'block', type: 'bulleted_list_item',
      bulleted_list_item: { rich_text: notionRichText(b) },
    })),
    {
      object: 'block', type: 'heading_3', heading_3: {
        rich_text: [
          { type: 'text', text: { content: 'Full Stack Developer' }, annotations: { bold: true } },
          { type: 'text', text: { content: '  |  Cognizant Technology Solutions  |  Mar 2021 – Apr 2024' } },
        ],
      },
    },
    ...CANDIDATE.cognizantBullets.map(b => ({
      object: 'block', type: 'bulleted_list_item',
      bulleted_list_item: { rich_text: notionRichText(b) },
    })),
    { object: 'block', type: 'divider', divider: {} },

    // Projects
    { object: 'block', type: 'heading_2', heading_2: { rich_text: notionRichText('KEY PROJECTS') } },
    ...CANDIDATE.projects.map(p => ({
      object: 'block', type: 'bulleted_list_item',
      bulleted_list_item: { rich_text: notionRichText(p) },
    })),
    { object: 'block', type: 'divider', divider: {} },

    // Education
    { object: 'block', type: 'heading_2', heading_2: { rich_text: notionRichText('EDUCATION') } },
    ...CANDIDATE.education.map(e => ({
      object: 'block', type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: e.degree }, annotations: { bold: true } },
          { type: 'text', text: { content: `  |  ${e.school}  |  ${e.dates}` } },
        ],
      },
    })),
  ];
}

// ── .docx generation ──

function hr() {
  return new Paragraph({
    border: { bottom: { color: 'AAAAAA', style: BorderStyle.SINGLE, size: 6 } },
    spacing: { after: 120 },
  });
}

function sectionHeading(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, font: 'Calibri' })],
    spacing: { before: 240, after: 80 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 22, ...opts })],
    spacing: { after: 60 },
  });
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Calibri', size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 40 },
  });
}

export async function buildDocx(analysis, summary) {
  const { resumeBullets = [], topKeywords = [] } = analysis;
  const skillsLine = buildSkillsLine(topKeywords);
  const margins = { top: convertInchesToTwip(0.75), bottom: convertInchesToTwip(0.75), left: convertInchesToTwip(0.75), right: convertInchesToTwip(0.75) };

  const doc = new Document({
    sections: [{
      properties: { page: { margin: margins } },
      children: [
        // Name
        new Paragraph({
          children: [new TextRun({ text: CANDIDATE.name, bold: true, size: 28, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }),
        // Contact
        new Paragraph({
          children: [new TextRun({ text: CANDIDATE.contact, size: 18, font: 'Calibri', color: '555555' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        }),

        // Summary
        sectionHeading('PROFESSIONAL SUMMARY'), hr(),
        body(summary),

        // Skills
        sectionHeading('TECHNICAL SKILLS'), hr(),
        body(skillsLine),

        // Experience
        sectionHeading('PROFESSIONAL EXPERIENCE'), hr(),
        new Paragraph({
          children: [
            new TextRun({ text: 'Full Stack Web Developer Intern  |  WalletGyde', bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: '  |  Dec 2024 – May 2025', size: 22, font: 'Calibri' }),
          ],
          spacing: { before: 120, after: 60 },
        }),
        ...resumeBullets.map(b => bullet(b)),
        new Paragraph({
          children: [
            new TextRun({ text: 'Full Stack Developer  |  Cognizant Technology Solutions', bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: '  |  Mar 2021 – Apr 2024', size: 22, font: 'Calibri' }),
          ],
          spacing: { before: 120, after: 60 },
        }),
        ...CANDIDATE.cognizantBullets.map(b => bullet(b)),

        // Projects
        sectionHeading('KEY PROJECTS'), hr(),
        ...CANDIDATE.projects.map(p => bullet(p)),

        // Education
        sectionHeading('EDUCATION'), hr(),
        ...CANDIDATE.education.map(e =>
          new Paragraph({
            children: [
              new TextRun({ text: e.degree, bold: true, size: 22, font: 'Calibri' }),
              new TextRun({ text: `  |  ${e.school}  |  ${e.dates}`, size: 22, font: 'Calibri' }),
            ],
            spacing: { after: 60 },
          })
        ),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer.toString('base64');
}
