"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Globe,
  Zap,
  Rocket,
  UserCircle,
  Target,
  FileEdit,
  Send,
  Database,
  ArrowDown,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    step: 1,
    icon: UserCircle,
    title: "Set Up Your Profile",
    description:
      "Upload your resume (PDF or DOCX), paste it directly, or extract it from your LinkedIn profile. Your profile is parsed by AI into a structured format and stored securely in your browser — never on our servers.",
    detail: "One-time setup. Takes less than 60 seconds.",
    color: "#00d4aa",
    bg: "rgba(0,212,170,0.10)",
    border: "rgba(0,212,170,0.25)",
  },
  {
    step: 2,
    icon: Globe,
    title: "Visit a Job Posting",
    description:
      "Go to any job listing on LinkedIn, Indeed, Greenhouse, Lever, Workday, or any other job board. JobHuntOS works on all major platforms with site-specific extractors and a universal fallback.",
    detail: "Supports LinkedIn, Indeed, Greenhouse, Lever, Workday, and more.",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.10)",
    border: "rgba(99,102,241,0.25)",
  },
  {
    step: 3,
    icon: Zap,
    title: "Click Analyze",
    description:
      "JobHuntOS extracts the full job description from the page and sends it along with your profile to Claude AI for analysis. In 3–8 seconds, you get a complete breakdown.",
    detail: "Powered by Claude Sonnet — fast, accurate, contextual.",
    color: "#facc15",
    bg: "rgba(250,204,21,0.10)",
    border: "rgba(250,204,21,0.25)",
  },
  {
    step: 4,
    icon: Rocket,
    title: "Apply with Confidence",
    description:
      "Use your fit score, ATS analysis, tailored resume bullets, and personalized outreach message to craft the perfect application. Save to Notion and generate a tailored .docx resume in one click.",
    detail: "From job page to ready-to-send application in under 10 seconds.",
    color: "#f472b6",
    bg: "rgba(244,114,182,0.10)",
    border: "rgba(244,114,182,0.25)",
  },
];

const outputItems = [
  { icon: Target, label: "Fit Score", desc: "0–100 match percentage with reasoning", color: "#00d4aa" },
  { icon: FileEdit, label: "Resume Bullets", desc: "3 bullets tailored to the specific job", color: "#60a5fa" },
  { icon: Zap, label: "ATS Score", desc: "Keyword match, format, and human writing scores", color: "#6366f1" },
  { icon: Send, label: "Outreach Message", desc: "LinkedIn DM ready to copy and send", color: "#f472b6" },
  { icon: Database, label: "Notion Save", desc: "Full application saved to your tracker", color: "#fb923c" },
  { icon: FileEdit, label: "Resume .docx", desc: "Tailored resume file ready to download", color: "#a78bfa" },
];

export default function HowItWorksPageContent() {
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
              background: "rgba(0,212,170,0.10)", border: "1px solid rgba(0,212,170,0.25)",
              color: "var(--c-accent)", fontSize: 12, fontWeight: 600, marginBottom: 20,
            }}>
              Simple as 1-2-3-4
            </div>
            <h1 style={{
              fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, color: "#fff",
              marginBottom: 20, lineHeight: 1.15,
            }}>
              From job posting to application{" "}
              <span style={{ color: "var(--c-accent)" }}>in 10 seconds</span>
            </h1>
            <p style={{
              fontSize: 18, color: "var(--c-muted)", lineHeight: 1.65,
              maxWidth: 540, margin: "0 auto 40px",
            }}>
              JobHuntOS reads any job posting, analyzes it against your profile, and generates everything you need to apply — instantly.
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
                Try It Free <ArrowRight size={16} />
              </a>
              <Link
                href="/features"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "12px 24px", borderRadius: 9999,
                  background: "var(--c-surface)", border: "1px solid var(--c-border)",
                  color: "var(--c-muted)", fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}
              >
                See all features →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding: "80px 0", background: "var(--c-surface)" }}>
        <div className="wrap">
          <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 720, margin: "0 auto" }}>
            {steps.map((step, i) => (
              <div key={step.step}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  style={{ display: "flex", gap: 28, alignItems: "flex-start" }}
                >
                  {/* Left: step indicator */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: step.bg, border: `1px solid ${step.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative",
                    }}>
                      <step.icon size={24} color={step.color} />
                      <div style={{
                        position: "absolute", top: -10, right: -10,
                        width: 24, height: 24, borderRadius: "50%",
                        background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: "#fff",
                        boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
                      }}>
                        {step.step}
                      </div>
                    </div>
                  </div>

                  {/* Right: content */}
                  <div style={{ paddingBottom: 48 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: 15, color: "var(--c-muted)", lineHeight: 1.75, marginBottom: 12 }}>
                      {step.description}
                    </p>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "4px 12px", borderRadius: 9999,
                      background: step.bg, border: `1px solid ${step.border}`,
                      fontSize: 12, color: step.color, fontWeight: 500,
                    }}>
                      {step.detail}
                    </div>
                  </div>
                </motion.div>

                {/* Connector arrow */}
                {i < steps.length - 1 && (
                  <div style={{ paddingLeft: 24, paddingBottom: 4 }}>
                    <ArrowDown size={20} color="var(--c-border)" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What you get */}
      <div style={{ padding: "80px 0" }}>
        <div className="wrap">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{ textAlign: "center", marginBottom: 48 }}
          >
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, color: "#fff", marginBottom: 14 }}>
              What you get from every analysis
            </h2>
            <p style={{ fontSize: 16, color: "var(--c-muted)", maxWidth: 440, margin: "0 auto" }}>
              Every job posting click generates a complete application kit.
            </p>
          </motion.div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}>
            {outputItems.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 16,
                  padding: "20px 20px", borderRadius: 16,
                  background: "var(--c-surface)", border: "1px solid var(--c-border)",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: `rgba(${item.color === "#00d4aa" ? "0,212,170" : item.color === "#60a5fa" ? "96,165,250" : item.color === "#6366f1" ? "99,102,241" : item.color === "#f472b6" ? "244,114,182" : item.color === "#fb923c" ? "251,146,60" : "167,139,250"},0.12)`,
                  border: `1px solid rgba(${item.color === "#00d4aa" ? "0,212,170" : item.color === "#60a5fa" ? "96,165,250" : item.color === "#6366f1" ? "99,102,241" : item.color === "#f472b6" ? "244,114,182" : item.color === "#fb923c" ? "251,146,60" : "167,139,250"},0.25)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <item.icon size={18} color={item.color} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: "var(--c-muted)", lineHeight: 1.5 }}>{item.desc}</div>
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
            background: "linear-gradient(135deg, rgba(0,212,170,0.08), rgba(99,102,241,0.12))",
            border: "1px solid rgba(0,212,170,0.2)", textAlign: "center",
          }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, color: "#fff", marginBottom: 12 }}>
              See it in action
            </h2>
            <p style={{ fontSize: 16, color: "var(--c-muted)", marginBottom: 28, maxWidth: 400, margin: "0 auto 28px" }}>
              Install the extension and analyze your first job in under a minute.
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
                href="/features"
                style={{
                  padding: "12px 28px", borderRadius: 9999,
                  background: "var(--c-surface2)", border: "1px solid var(--c-border)",
                  color: "var(--c-muted)", fontSize: 14, fontWeight: 600, textDecoration: "none",
                }}
              >
                View All Features
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
