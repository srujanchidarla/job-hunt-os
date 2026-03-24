import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — JobHuntOS",
  description: "JobHuntOS privacy policy — your data stays on your device.",
};

const sections = [
  {
    title: "What We Collect",
    content:
      "JobHuntOS collects very little data. When you analyze a job posting, the job description text and your stored profile are sent to our backend server, which passes them to the Anthropic Claude API to generate analysis results. This text is processed in real-time and is not stored on our servers.",
  },
  {
    title: "What We Never Collect",
    content:
      "We do not collect your name, email address, IP address, browsing history, cookies, analytics data, or any personally identifiable information. We have no user accounts and no database of user data. Your resume profile is stored exclusively in your browser's local storage.",
  },
  {
    title: "How Your Resume Profile is Stored",
    content:
      "When you set up your profile in the extension, it is stored using chrome.storage.local — a browser-local storage mechanism that keeps data only on your device. This data is never synced to our servers. You can delete it at any time by uninstalling the extension or clearing extension storage in Chrome settings.",
  },
  {
    title: "Third-Party Services",
    content:
      "JobHuntOS integrates with two third-party APIs:\n\n• Anthropic Claude API — used to analyze job postings and generate tailored content. Job text and your profile are sent to Anthropic when you click \"Analyze\". Anthropic's privacy policy applies.\n\n• Notion API — used only when you click \"Save to Notion\". Your Notion API key is stored locally in your browser and sent only to Notion's servers. Notion's privacy policy applies.",
  },
  {
    title: "Your Rights",
    content:
      "You can delete all locally stored data at any time by uninstalling the extension or clearing its storage in Chrome's extension settings. Since we don't store data on our servers, there is nothing to request deletion of from us.",
  },
  {
    title: "Contact",
    content:
      "Questions about privacy? Email us at srujanchidarla.uof@gmail.com. We typically respond within 48 hours.",
  },
];

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p style={{ fontSize: 18, color: "var(--c-muted)", lineHeight: 1.65 }}>
            We built JobHuntOS to help you, not to harvest your data.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--c-border)", marginBottom: 48 }} />

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 24 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "var(--c-primary)", marginTop: 2,
              }}>
                {i + 1}
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{s.title}</h2>
                <p style={{ fontSize: 15, color: "var(--c-muted)", lineHeight: 1.75, whiteSpace: "pre-line" }}>{s.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 64, padding: 24, borderRadius: 16, background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <p style={{ fontSize: 14, color: "var(--c-muted)", lineHeight: 1.7, textAlign: "center" }}>
            This privacy policy applies to the JobHuntOS Chrome Extension and its backend service.
            By using JobHuntOS, you agree to this policy. We may update it occasionally — changes will be noted with the updated date above.
          </p>
        </div>
      </div>
    </div>
  );
}
