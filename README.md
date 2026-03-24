# ⚡ JobHuntOS

> **AI-powered job application assistant — Chrome Extension + Node.js backend + Next.js website**
>
> Built for the **Notion MCP Hackathon** · March 2026

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org)
[![Claude AI](https://img.shields.io/badge/AI-Claude%20Sonnet-orange.svg)](https://anthropic.com)

---

## What is JobHuntOS?

JobHuntOS is a Chrome extension that analyzes any job posting in seconds and generates everything you need to apply with confidence:

- **Fit Score (0–100)** — how well your profile matches the role
- **ATS Analysis** — keyword match, format score, human writing score
- **Tailored Resume Bullets** — 3 bullets rewritten for the specific job
- **Humanize AI Writing** — removes robotic language, keeps your metrics
- **Personalized Outreach Message** — LinkedIn DM ready to copy
- **Notion Job Tracker** — saves every application automatically
- **Resume Generator** — creates a tailored .docx + Notion sub-page

---

## Project Structure

```
job-hunt-os/
├── backend/                    # Node.js + Express API server
│   ├── src/
│   │   ├── index.js            # Entry point, dotenv, CORS, routes
│   │   ├── routes/
│   │   │   └── analyze.js      # /api/analyze, /save, /humanize, /generate-resume, /parse-profile
│   │   └── services/
│   │       ├── claude.js       # Anthropic SDK — analysis, humanize, parse, summary
│   │       ├── notion.js       # Notion client — save applications
│   │       ├── resume.js       # Build Notion blocks + generate .docx
│   │       └── scraper.js      # Axios + Cheerio — scrape job pages
│   ├── .env                    # API keys (not committed)
│   └── package.json
│
├── chrome-extension/           # Manifest V3 Chrome Extension
│   ├── manifest.json           # Permissions, service worker, web accessible resources
│   ├── background.js           # Service worker — sidebar toggle, page text extraction
│   ├── content.js              # Injected into job pages — extracts text, detects URL changes
│   ├── sidebar.html            # Main extension UI
│   ├── sidebar.css             # Dark theme styles
│   ├── sidebar.js              # All UI logic — analyze, save, humanize, generate resume
│   ├── setup.html              # Profile setup overlay (embedded in sidebar)
│   ├── setup.css               # Setup overlay styles
│   └── setup.js                # Profile upload/paste/LinkedIn logic
│
└── website/                    # Next.js 15 marketing site
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx         # Landing page
    │   │   ├── layout.tsx       # Shared layout (Navbar + Footer)
    │   │   ├── globals.css      # CSS variables + Tailwind v4 base
    │   │   ├── privacy/         # Privacy policy
    │   │   ├── terms/           # Terms of service
    │   │   ├── support/         # Support + troubleshooting
    │   │   └── changelog/       # Release history
    │   └── components/
    │       ├── Navbar.tsx
    │       ├── Footer.tsx
    │       ├── Hero.tsx
    │       ├── SocialProof.tsx
    │       ├── HowItWorks.tsx
    │       ├── Features.tsx
    │       ├── DemoSection.tsx
    │       ├── BuiltBy.tsx
    │       ├── FAQ.tsx
    │       └── CTABanner.tsx
    └── package.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Chrome Extension | Manifest V3, Vanilla JS, Content Scripts |
| Backend | Node.js 22, Express, ES Modules |
| AI | Anthropic Claude Sonnet (claude-sonnet-4-5) |
| Notion | @notionhq/client — Notion MCP Integration |
| Scraping | Axios + Cheerio |
| File Parsing | pdf-parse, mammoth (DOCX) |
| Resume Export | docx npm package |
| Website | Next.js 15, TypeScript, Tailwind CSS v4, Framer Motion |

---

## Prerequisites

- **Node.js 18+** (tested on v22)
- **Google Chrome** (for the extension)
- **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com)
- **Notion account + integration** (optional — for save/tracker features)

---

## Setup & Installation

### 1. Clone the repo

```bash
git clone https://github.com/srujanchidarla/job-hunt-os.git
cd job-hunt-os
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
ANTHROPIC_API_KEY=sk-ant-...
NOTION_API_KEY=secret_...
NOTION_DATABASE_ID=your-database-id-here
PORT=3000
```

Start the backend:

```bash
npm run dev       # development (nodemon)
npm start         # production
```

The backend runs at `http://localhost:3000`. Verify with:

```bash
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}
```

### 3. Load the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder

The JobHuntOS icon will appear in your Chrome toolbar.

### 4. Set up your profile

1. Click the JobHuntOS icon on any page
2. The **Set Up Your Profile** screen will appear automatically
3. Upload your resume (PDF/DOCX), paste it, or extract from your LinkedIn profile
4. Click **Save Profile & Continue**

### 5. Set up Notion (optional)

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Create a new integration → copy the **Internal Integration Secret**
3. Set it as `NOTION_API_KEY` in `backend/.env`
4. Create a Notion database for job tracking
5. Open the database → click `...` → **Connections** → add your integration
6. Copy the database ID from the URL: `notion.so/{workspace}/{DATABASE_ID}?v=...`
7. Set it as `NOTION_DATABASE_ID` in `backend/.env`

---

## How It Works

```
User visits job posting
        ↓
content.js extracts job description text
        ↓
User clicks "Analyze This Job"
        ↓
sidebar.js POSTs {url, rawText, userProfile} → /api/analyze
        ↓
backend/scraper.js fetches full page (if URL only)
        ↓
backend/claude.js sends to Anthropic Claude
        ↓
Claude returns JSON: fitScore, resumeBullets, atsScore, outreachMessage, etc.
        ↓
sidebar.js renders results with animated SVG score rings
        ↓
Optional: "Humanize" → /api/humanize (rewrites with natural voice)
Optional: "Save to Notion" → /api/save → creates Notion page
Optional: "Generate Resume" → /api/generate-resume → Notion sub-page + .docx
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/analyze` | Analyze job posting — returns fit score, ATS, bullets, outreach |
| `POST` | `/api/save` | Save analysis to Notion database |
| `POST` | `/api/humanize` | Rewrite bullets/outreach to sound more human |
| `POST` | `/api/generate-resume` | Create tailored resume (Notion page + .docx) |
| `POST` | `/api/parse-profile` | Parse resume text/PDF/DOCX into structured profile |

### POST `/api/analyze`

```json
{
  "url": "https://linkedin.com/jobs/view/...",
  "rawText": "...",
  "userProfile": "Full name: ...\nExperience: ..."
}
```

**Response:**

```json
{
  "company": "Walmart",
  "role": "Staff Software Engineer",
  "fitScore": 87,
  "fitReasoning": "Strong match...",
  "resumeBullets": ["Scaled...", "Reduced...", "Led..."],
  "skillsGap": ["Kafka", "Kubernetes"],
  "outreachMessage": "Hi...",
  "topKeywords": ["React", "Node.js", "AWS", "microservices", "CI/CD"],
  "atsScore": {
    "overall": 78,
    "keyword": 82,
    "format": 75,
    "human": 76,
    "breakdown": {
      "keywordsFound": [...],
      "keywordsMissing": [...],
      "suggestions": [...]
    }
  }
}
```

---

## Supported Job Boards

| Site | Status |
|---|---|
| LinkedIn | ✅ Full support (site-specific selectors) |
| Greenhouse | ✅ Full support |
| Lever | ✅ Full support |
| Indeed | ✅ Full support |
| Workday | ✅ Supported (scroll to load first) |
| AngelList / Wellfound | ✅ Generic fallback |
| All others | ✅ Generic text extraction |

---

## Website

The marketing website lives in `website/` and is built with Next.js 15 + Tailwind CSS v4 + Framer Motion.

```bash
cd website
npm install
npm run dev     # → http://localhost:3001
npm run build   # production build
```

**Pages:**
- `/` — Landing page
- `/changelog` — Release history + roadmap
- `/privacy` — Privacy policy
- `/terms` — Terms of service
- `/support` — Troubleshooting + contact

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key from console.anthropic.com |
| `NOTION_API_KEY` | Optional | Notion integration secret |
| `NOTION_DATABASE_ID` | Optional | ID of your Notion job tracker database |
| `PORT` | Optional | Backend port (default: 3000) |

---

## Chrome Extension Architecture

```
manifest.json
├── background.js (service worker)
│   ├── Handles toolbar click → injects content.js
│   └── GET_PAGE_TEXT message handler (for LinkedIn profile extraction)
│
├── content.js (injected into every page)
│   ├── Extracts job description text (LinkedIn-specific + generic)
│   ├── Detects SPA URL changes (MutationObserver + setInterval)
│   └── Sends PAGE_DATA, URL_CHANGED, EXTRACTION_ERROR to sidebar
│
└── sidebar.html / sidebar.js / sidebar.css
    ├── Profile setup overlay (inline — no iframe)
    │   ├── Upload File tab (PDF/DOCX → base64 → /api/parse-profile)
    │   ├── Paste Resume tab
    │   └── LinkedIn tab (GET_PAGE_TEXT → /api/parse-profile)
    └── Analysis UI
        ├── Fit score (animated SVG ring)
        ├── ATS analysis (collapsible, 3 mini rings)
        ├── Resume bullets (with AI word detection + highlighting)
        ├── Outreach message (copy button)
        ├── Skills gap + top keywords tags
        ├── Humanize button
        ├── Save to Notion button
        └── Generate Resume (shown after save)
```

---

## Known Limitations

- Requires a locally running backend server
- AI analysis takes 3–8 seconds depending on Claude API response time
- LinkedIn requires the job details panel to be visible and scrolled
- PDF text extraction may miss complex layouts — pasting is more reliable
- Notion setup requires manual API key configuration

---

## Contributing

This project was built as a hackathon submission. PRs and issues are welcome!

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push and open a PR

---

## Author

**Srujan Chidarla**
M.S. Computer Science · GPA 4.0

- Portfolio: [srujanchidarla.com](https://srujanchidarla.com)
- LinkedIn: [linkedin.com/in/srujan-chidarla](https://www.linkedin.com/in/srujan-chidarla/)
- GitHub: [github.com/srujanchidarla](https://github.com/srujanchidarla)
- Email: srujanchidarla.uof@gmail.com

---

## License

MIT — use it, fork it, build on it.

---

*Built with ⚡ for the Notion MCP Hackathon · March 2026*
