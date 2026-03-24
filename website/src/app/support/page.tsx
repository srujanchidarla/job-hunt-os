"use client";

import { useState } from "react";
import { ChevronDown, Mail, Github, AlertCircle, Chrome, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  {
    q: "The sidebar isn't showing up. What do I do?",
    a: "Make sure you've clicked the JobHuntOS icon in the Chrome toolbar. If it still doesn't appear, try refreshing the page and clicking the icon again. The extension requires an active tab with a job posting URL.",
  },
  {
    q: "I'm getting 'Analysis failed'. What's wrong?",
    a: "This usually means the backend server isn't running. Make sure you've started the backend with `npm run dev` in the backend folder. Also check that your .env file has valid ANTHROPIC_API_KEY set.",
  },
  {
    q: "The fit score is 0 or shows as invalid.",
    a: "This happens when the page doesn't have enough job description text loaded. Try scrolling down to fully load all the job details, then click Re-analyze.",
  },
  {
    q: "Notion save is failing.",
    a: "Check that your NOTION_API_KEY and NOTION_DATABASE_ID are correctly set in backend/.env. Also verify that your Notion integration has been granted access to the specific database.",
  },
  {
    q: "My profile upload isn't working.",
    a: "Make sure the backend server is running before uploading. PDF and DOCX files up to 5MB are supported. If extraction fails, try pasting your resume text directly in the Paste Resume tab instead.",
  },
  {
    q: "Which job sites work best?",
    a: "LinkedIn and Greenhouse work best. Indeed and Lever work well too. Workday can sometimes require scrolling to fully load the job description before analyzing.",
  },
  {
    q: "How do I set up my Notion integration?",
    a: "Go to notion.so/my-integrations, create a new integration, copy the API key to your backend .env as NOTION_API_KEY. Then open your Notion database, click the three-dot menu, go to Connections, and add your integration.",
  },
  {
    q: "Can I analyze jobs without Notion?",
    a: "Yes — the fit score, ATS analysis, resume bullets, and outreach message all work without any Notion setup. Notion is only needed for the Save and Generate Resume features.",
  },
];

function AccordionItem({ faq, index }: { faq: { q: string; a: string }; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)", borderRadius: 14, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", paddingRight: 16, lineHeight: 1.4 }}>{faq.q}</span>
        <ChevronDown size={16} color="var(--c-muted)"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div style={{ padding: "0 20px 18px" }}>
              <p style={{ fontSize: 14, color: "var(--c-muted)", lineHeight: 1.7 }}>{faq.a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const limitations = [
  "Requires a running local backend server (Node.js + npm)",
  "AI analysis takes 3–8 seconds depending on API response time",
  "LinkedIn may need the page to fully scroll before analysis works",
  "PDF extraction may miss some formatting — pasting text is more reliable",
  "Notion integration requires manual API key configuration",
  "Resume .docx generation uses a fixed template layout",
];

export default function SupportPage() {
  return (
    <div style={{ background: "var(--c-bg)", minHeight: "100vh", width: "100%" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 24px 80px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 9999, background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.25)", color: "var(--c-primary)", fontSize: 12, fontWeight: 600, marginBottom: 20 }}>
            Help Center
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 800, color: "#fff", marginBottom: 14, lineHeight: 1.2 }}>
            Support
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-muted)", lineHeight: 1.65, maxWidth: 520 }}>
            Troubleshooting guides, known limitations, and how to get help.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40, alignItems: "start" }}>

          {/* Left column */}
          <div style={{ gridColumn: "span 2" }} id="faq">

            {/* FAQ */}
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Troubleshooting FAQ</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 48 }}>
              {faqs.map((faq, i) => (
                <AccordionItem key={i} faq={faq} index={i} />
              ))}
            </div>

            {/* Known limitations */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertCircle size={18} color="#f59e0b" />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>Known Limitations</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {limitations.map((item) => (
                  <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 12, background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-primary)", marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "var(--c-muted)", lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Browser compatibility */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Chrome size={18} color="var(--c-primary)" />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>Browser Compatibility</h2>
              </div>
              <div style={{ padding: "20px 24px", borderRadius: 14, background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                <p style={{ fontSize: 15, color: "var(--c-muted)", lineHeight: 1.75 }}>
                  JobHuntOS is built as a Chrome Extension (Manifest V3) and works on{" "}
                  <strong style={{ color: "#fff" }}>Google Chrome</strong> and{" "}
                  <strong style={{ color: "#fff" }}>Microsoft Edge</strong> (Chromium-based).
                  Firefox and Safari are not currently supported.
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                  {[{ label: "Chrome 88+", ok: true }, { label: "Edge 88+", ok: true }, { label: "Firefox", ok: false }, { label: "Safari", ok: false }].map(b => (
                    <span key={b.label} style={{
                      padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                      background: b.ok ? "rgba(0,212,170,0.12)" : "rgba(239,68,68,0.10)",
                      border: `1px solid ${b.ok ? "rgba(0,212,170,0.25)" : "rgba(239,68,68,0.20)"}`,
                      color: b.ok ? "var(--c-accent)" : "#ef4444",
                    }}>
                      {b.ok ? "✓" : "✗"} {b.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column — contact card (sticky) */}
          <div id="contact" style={{ position: "sticky", top: 88 }}>
            <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 20, padding: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Need help?</h3>
              <p style={{ fontSize: 14, color: "var(--c-muted)", marginBottom: 24, lineHeight: 1.6 }}>
                Can&apos;t find what you need? Reach out directly.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <a href="mailto:srujanchidarla.uof@gmail.com"
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, background: "var(--c-surface2)", border: "1px solid var(--c-border)", textDecoration: "none", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--c-border)"}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Mail size={16} color="var(--c-primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>Email</div>
                    <div style={{ fontSize: 12, color: "var(--c-muted)" }}>srujanchidarla.uof@gmail.com</div>
                  </div>
                </a>

                <a href="https://github.com/srujanchidarla/job-hunt-os" target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, background: "var(--c-surface2)", border: "1px solid var(--c-border)", textDecoration: "none", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--c-border)"}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Github size={16} color="var(--c-primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>GitHub Issues</div>
                    <div style={{ fontSize: 12, color: "var(--c-muted)" }}>srujanchidarla/job-hunt-os</div>
                  </div>
                </a>
              </div>

              <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 10, background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.2)", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--c-accent)", fontWeight: 500 }}>⚡ Response within 48 hours</p>
              </div>
            </div>

            {/* Quick tips card */}
            <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 20, padding: 28, marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Cpu size={16} color="var(--c-primary)" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Quick Setup Checklist</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Backend running: cd backend && npm run dev",
                  "ANTHROPIC_API_KEY set in backend/.env",
                  "Extension loaded in chrome://extensions (Developer mode)",
                  "Profile set up via extension gear icon ⚙",
                  "Notion integration connected (optional)",
                ].map((tip, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--c-accent)" }}>{i + 1}</span>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--c-muted)", lineHeight: 1.5 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
