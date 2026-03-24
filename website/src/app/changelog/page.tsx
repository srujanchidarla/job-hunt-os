import type { Metadata } from "next";
import { Rocket, Clock, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog — JobHuntOS",
  description: "What's new in JobHuntOS — release history and upcoming features.",
};

const v1Features = [
  "Fit score analysis (0–100) powered by Claude AI",
  "ATS scoring — keyword, format, and human writing scores",
  "3 tailored resume bullets per job posting",
  "Humanize AI writing — one-click rewrite to natural voice",
  "Personalized LinkedIn outreach message generation",
  "Notion MCP integration — save applications automatically",
  "Chrome extension with floating sidebar (Manifest V3)",
  "LinkedIn, Indeed, Greenhouse, Lever, Workday support",
  "User profile setup via PDF upload, paste, or LinkedIn extraction",
  "Resume generation — Notion sub-page + downloadable .docx",
  "ATS keyword gap analysis with actionable suggestions",
  "Skills gap detection with missing keyword list",
  "Re-analyze on URL change detection",
  "Collapsible ATS analysis panel",
];

const roadmap = [
  { label: "Indeed & Glassdoor salary data integration", tag: "Planned" },
  { label: "Interview prep questions generated from the JD", tag: "Planned" },
  { label: "Application follow-up reminder system", tag: "Planned" },
  { label: "Team and referral tracking", tag: "Exploring" },
  { label: "Job pipeline analytics dashboard", tag: "Exploring" },
  { label: "Multiple resume profile support", tag: "Exploring" },
];

const tagColors: Record<string, { bg: string; border: string; color: string }> = {
  Planned: { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.25)", color: "var(--c-primary)" },
  Exploring: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", color: "#f59e0b" },
};

export default function ChangelogPage() {
  return (
    <div style={{ background: "var(--c-bg)", minHeight: "100vh", width: "100%" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "120px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 9999, background: "rgba(0,212,170,0.10)", border: "1px solid rgba(0,212,170,0.25)", color: "var(--c-accent)", fontSize: 12, fontWeight: 600, marginBottom: 20 }}>
            Release History
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 800, color: "#fff", marginBottom: 14, lineHeight: 1.2 }}>
            Changelog
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-muted)", lineHeight: 1.65 }}>
            What&apos;s new in JobHuntOS.
          </p>
        </div>

        {/* Timeline */}
        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 19, top: 44, bottom: 0, width: 2, background: "var(--c-border)" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>

            {/* v1.0.0 */}
            <div style={{ position: "relative", paddingLeft: 60 }}>
              <div style={{
                position: "absolute", left: 0, top: 0, width: 40, height: 40, borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
              }}>
                <Rocket size={20} color="white" />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 9999, background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: "var(--c-accent)" }}>
                  v1.0.0
                </span>
                <span style={{ fontSize: 13, color: "var(--c-muted)" }}>March 2026</span>
                <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 9999, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "var(--c-primary)", fontWeight: 600 }}>
                  Latest
                </span>
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>🚀 Initial Launch</h2>
              <p style={{ fontSize: 14, color: "var(--c-muted)", marginBottom: 24, lineHeight: 1.6 }}>
                The first public release of JobHuntOS — a full-stack Chrome extension for AI-powered job applications,
                built for the Notion MCP Hackathon.
              </p>

              <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>✨ {v1Features.length} features shipped</span>
                </div>
                <div style={{ padding: "8px 0" }}>
                  {v1Features.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 20px" }}>
                      <CheckCircle size={14} color="var(--c-accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: "var(--c-muted)", lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Roadmap */}
            <div style={{ position: "relative", paddingLeft: 60 }}>
              <div style={{
                position: "absolute", left: 0, top: 0, width: 40, height: 40, borderRadius: 12,
                background: "var(--c-surface2)", border: "1px solid var(--c-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Clock size={20} color="var(--c-muted)" />
              </div>

              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 9999, background: "var(--c-surface2)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
                  Upcoming
                </span>
              </div>

              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>On the Roadmap</h2>
              <p style={{ fontSize: 14, color: "var(--c-muted)", marginBottom: 24, lineHeight: 1.6 }}>
                Features we&apos;re working on or exploring for future releases.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {roadmap.map((item, i) => {
                  const t = tagColors[item.tag];
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 20px", borderRadius: 12, background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-primary)", flexShrink: 0 }} />
                        <span style={{ fontSize: 14, color: "var(--c-muted)" }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 9999, background: t.bg, border: `1px solid ${t.border}`, color: t.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {item.tag}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Feedback CTA */}
        <div style={{ marginTop: 64, padding: 28, borderRadius: 20, background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(0,212,170,0.08))", border: "1px solid rgba(99,102,241,0.2)", textAlign: "center" }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Have a feature request?</p>
          <p style={{ fontSize: 14, color: "var(--c-muted)", marginBottom: 20 }}>Open an issue on GitHub or send an email — I read everything.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://github.com/srujanchidarla/job-hunt-os/issues" target="_blank" rel="noopener noreferrer"
              style={{ padding: "10px 22px", borderRadius: 9999, background: "var(--c-primary)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Open GitHub Issue →
            </a>
            <a href="mailto:srujanchidarla.uof@gmail.com"
              style={{ padding: "10px 22px", borderRadius: 9999, background: "var(--c-surface2)", border: "1px solid var(--c-border)", color: "var(--c-muted)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Send Email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
