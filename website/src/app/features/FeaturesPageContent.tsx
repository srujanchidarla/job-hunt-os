"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Target,
  ShieldCheck,
  FileEdit,
  Sparkles,
  Send,
  Database,
  FileText,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Fit Score (0–100)",
    description:
      "See exactly how well your profile matches the role. Green = strong match. Red = significant gaps to address. The score weighs skills overlap, experience level, and keyword density.",
    iconColor: "#00d4aa",
    iconBg: "rgba(0,212,170,0.12)",
    iconBorder: "rgba(0,212,170,0.25)",
    bullets: [
      "Instant match percentage against your profile",
      "Detailed reasoning behind the score",
      "Color-coded visual indicator (0–100 ring)",
    ],
  },
  {
    icon: ShieldCheck,
    title: "ATS Analysis",
    description:
      "Keyword match, format check, and human writing score. Know if your resume will pass automated screening before you apply.",
    iconColor: "#6366f1",
    iconBg: "rgba(99,102,241,0.12)",
    iconBorder: "rgba(99,102,241,0.25)",
    bullets: [
      "Keyword match score with missing keywords listed",
      "Format and structure assessment",
      "Human writing naturalness score",
    ],
  },
  {
    icon: FileEdit,
    title: "Tailored Resume Bullets",
    description:
      "3 resume bullets rewritten specifically for THIS job, with your metrics and their keywords woven in naturally.",
    iconColor: "#60a5fa",
    iconBg: "rgba(96,165,250,0.12)",
    iconBorder: "rgba(96,165,250,0.25)",
    bullets: [
      "Uses your real experience and metrics",
      "Incorporates JD-specific keywords naturally",
      "AI word detection with highlighting",
    ],
  },
  {
    icon: Sparkles,
    title: "Humanize AI Writing",
    description:
      "One click rewrites AI-sounding text into natural human voice — keeps all metrics, removes robotic language.",
    iconColor: "#facc15",
    iconBg: "rgba(250,204,21,0.12)",
    iconBorder: "rgba(250,204,21,0.25)",
    bullets: [
      "Detects and highlights AI-generated phrasing",
      "Preserves all numbers and achievements",
      "Sounds like you, not a language model",
    ],
  },
  {
    icon: Send,
    title: "Personalized Outreach",
    description:
      "LinkedIn outreach message written for this specific role and company. Ready to copy and send in one click.",
    iconColor: "#f472b6",
    iconBg: "rgba(244,114,182,0.12)",
    iconBorder: "rgba(244,114,182,0.25)",
    bullets: [
      "References specific company and role details",
      "Highlights your most relevant experience",
      "Under 300 characters — LinkedIn-ready",
    ],
  },
  {
    icon: Database,
    title: "Notion Job Tracker",
    description:
      "Every application saved to your Notion workspace automatically. Full pipeline: To Apply → Interviewing → Offer.",
    iconColor: "#fb923c",
    iconBg: "rgba(251,146,60,0.12)",
    iconBorder: "rgba(251,146,60,0.25)",
    bullets: [
      "Auto-saves company, role, fit score, and bullets",
      "Structured Notion database with status columns",
      "Full pipeline management in one place",
    ],
  },
  {
    icon: FileText,
    title: "Resume Generator",
    description:
      "Creates a tailored .docx resume + Notion sub-page from your profile, rewritten for the specific job posting.",
    iconColor: "#a78bfa",
    iconBg: "rgba(167,139,250,0.12)",
    iconBorder: "rgba(167,139,250,0.25)",
    bullets: [
      "Downloadable .docx with tailored content",
      "Notion sub-page with structured sections",
      "Available after saving to Notion",
    ],
  },
];

const highlights = [
  "Works on LinkedIn, Indeed, Greenhouse, Lever, Workday",
  "Profile stored locally — never on our servers",
  "3–8 second analysis powered by Claude AI",
  "Zero setup required for core features",
];

export default function FeaturesPageContent() {
  return (
    <div style={{ background: "var(--c-bg)", minHeight: "100vh", width: "100%" }}>

      {/* Hero */}
      <div style={{ padding: "120px 0 72px", textAlign: "center" }}>
        <div className="wrap">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "5px 14px", borderRadius: 9999,
              background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.25)",
              color: "var(--c-primary)", fontSize: 12, fontWeight: 600, marginBottom: 20,
            }}>
              Powered by Claude AI + Notion MCP
            </div>
            <h1 style={{
              fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, color: "#fff",
              marginBottom: 20, lineHeight: 1.15,
            }}>
              Everything you need to{" "}
              <span style={{ color: "var(--c-primary)" }}>land the job</span>
            </h1>
            <p style={{
              fontSize: 18, color: "var(--c-muted)", lineHeight: 1.65,
              maxWidth: 560, margin: "0 auto 40px",
            }}>
              From job analysis to Notion tracking — all in one Chrome extension, in under 10 seconds.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href="https://chrome.google.com/webstore"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "12px 24px", borderRadius: 9999,
                  background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                  color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}
              >
                Add to Chrome — Free <ArrowRight size={16} />
              </a>
              <Link
                href="/how-it-works"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "12px 24px", borderRadius: 9999,
                  background: "var(--c-surface)", border: "1px solid var(--c-border)",
                  color: "var(--c-muted)", fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}
              >
                How it works →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Quick highlights bar */}
      <div style={{ background: "var(--c-surface)", borderTop: "1px solid var(--c-border)", borderBottom: "1px solid var(--c-border)", padding: "20px 0" }}>
        <div className="wrap">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
            {highlights.map((h) => (
              <div key={h} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={14} color="var(--c-accent)" />
                <span style={{ fontSize: 13, color: "var(--c-muted)" }}>{h}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ padding: "80px 0" }}>
        <div className="wrap">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 32,
          }}>
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                style={{
                  padding: 28,
                  borderRadius: 20,
                  background: "var(--c-surface)",
                  border: "1px solid var(--c-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                {/* Icon + title */}
                <div>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: f.iconBg, border: `1px solid ${f.iconBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 16,
                  }}>
                    <f.icon size={22} color={f.iconColor} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 14, color: "var(--c-muted)", lineHeight: 1.7 }}>
                    {f.description}
                  </p>
                </div>

                {/* Bullets */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4, borderTop: "1px solid var(--c-border)" }}>
                  {f.bullets.map((b) => (
                    <div key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <CheckCircle size={13} color={f.iconColor} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--c-muted)", lineHeight: 1.5 }}>{b}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "0 0 80px" }}>
        <div className="wrap">
          <div style={{
            padding: "48px 40px", borderRadius: 24,
            background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(0,212,170,0.08))",
            border: "1px solid rgba(99,102,241,0.2)", textAlign: "center",
          }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, color: "#fff", marginBottom: 12 }}>
              Ready to apply smarter?
            </h2>
            <p style={{ fontSize: 16, color: "var(--c-muted)", marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
              Install the extension in seconds and start analyzing jobs immediately.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href="https://chrome.google.com/webstore"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "12px 28px", borderRadius: 9999,
                  background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                  color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}
              >
                Add to Chrome — Free
              </a>
              <Link
                href="/how-it-works"
                style={{
                  padding: "12px 28px", borderRadius: 9999,
                  background: "var(--c-surface2)", border: "1px solid var(--c-border)",
                  color: "var(--c-muted)", fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}
              >
                See How it Works
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
