import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — JobHuntOS",
  description: "JobHuntOS terms of service — plain English, no jargon.",
};

const sections = [
  {
    icon: "🆓",
    title: "Free to Use, Provided As-Is",
    content:
      "JobHuntOS is free to use during beta. We provide the extension as-is, without warranties of any kind. We may change, update, or discontinue features at any time.",
  },
  {
    icon: "🔒",
    title: "You Own Your Data",
    content:
      "Any content you create using JobHuntOS — resume bullets, outreach messages, analysis results — belongs to you. We claim no ownership over it.",
  },
  {
    icon: "✅",
    title: "Use Responsibly",
    content:
      "Don't use JobHuntOS to misrepresent your qualifications. The AI generates tailored content based on your actual profile — you are responsible for ensuring what you submit to employers is accurate and truthful.",
  },
  {
    icon: "⚠️",
    title: "AI Output May Contain Errors",
    content:
      "Claude AI generates content based on statistical patterns. The output may occasionally be inaccurate, outdated, or not perfectly suited to your situation. Always review AI-generated content before using it in a job application.",
  },
  {
    icon: "🔗",
    title: "Third-Party Terms Apply",
    content:
      "When you use JobHuntOS with Anthropic (Claude API) or Notion, those services' own terms of service and privacy policies also apply to your use. We are not responsible for third-party service availability or policy changes.",
  },
  {
    icon: "✉️",
    title: "Contact",
    content:
      "Questions? Email srujanchidarla.uof@gmail.com. We're happy to clarify anything and typically respond within 48 hours.",
  },
];

export default function TermsPage() {
  return (
    <div style={{ background: "var(--c-bg)", minHeight: "100vh", width: "100%" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "120px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px", borderRadius: 9999,
            background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.25)",
            color: "var(--c-primary)", fontSize: 12, fontWeight: 600, marginBottom: 20,
          }}>
            Last updated: March 2026
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 800, color: "#fff", marginBottom: 14, lineHeight: 1.2 }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-muted)", lineHeight: 1.65 }}>
            Short, plain English. No legal jargon.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--c-border)", marginBottom: 48 }} />

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {sections.map((s, i) => (
            <div key={i} style={{
              display: "flex", gap: 20, padding: "28px 0",
              borderBottom: i < sections.length - 1 ? "1px solid var(--c-border)" : "none",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: "var(--c-surface)", border: "1px solid var(--c-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, marginTop: 2,
              }}>
                {s.icon}
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{s.title}</h2>
                <p style={{ fontSize: 15, color: "var(--c-muted)", lineHeight: 1.75 }}>{s.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 56, padding: 24, borderRadius: 16, background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <p style={{ fontSize: 14, color: "var(--c-muted)", lineHeight: 1.7, textAlign: "center" }}>
            By installing and using JobHuntOS, you agree to these terms.
            These terms are effective as of March 2026 and may be updated periodically.
          </p>
        </div>
      </div>
    </div>
  );
}
