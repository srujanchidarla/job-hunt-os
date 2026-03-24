"use client";

import { motion } from "framer-motion";

const steps = [
  "Visit any job posting on LinkedIn, Indeed, or Greenhouse",
  "JobHuntOS sidebar slides in automatically",
  "Fit score appears in ~4 seconds",
  "Review tailored resume bullets & outreach message",
  'Click "Humanize" to polish AI-generated text',
  'Click "Save to Notion" to track the application',
];

export default function DemoSection() {
  return (
    <section
      id="demo"
      style={{ padding: "96px 0", background: "var(--c-bg)", width: "100%" }}
    >
      <div className="wrap">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 48 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px", borderRadius: 9999,
            background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.25)",
            color: "var(--c-primary)", fontSize: 12, fontWeight: 600, marginBottom: 16,
          }}>
            Live Demo
          </div>
          <h2 style={{
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
            fontWeight: 800, color: "#fff", marginBottom: 16,
          }}>
            See it in action
          </h2>
          <p style={{
            fontSize: 18, color: "var(--c-muted)",
            maxWidth: 480, margin: "0 auto",
          }}>
            From job posting to tailored application in seconds — no copy-paste, no manual work.
          </p>
        </motion.div>

        {/* Video — centered, full width, capped at 900px */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            maxWidth: 900,
            margin: "0 auto 48px",
            borderRadius: 16,
            overflow: "hidden",
            border: "1px solid var(--c-border)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, background: "#000" }}>
            <iframe
              src="https://www.youtube.com/embed/PGQbOUR9wSg?rel=0&modestbranding=1"
              title="JobHuntOS Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
              }}
            />
          </div>
        </motion.div>

        {/* Steps row below the video */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{
            maxWidth: 900,
            margin: "0 auto",
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 16,
            padding: "32px 40px",
          }}
        >
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px 32px",
          }}>
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
                }}>
                  <span style={{ color: "var(--c-primary)", fontSize: 11, fontWeight: 700 }}>
                    {i + 1}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--c-muted)", lineHeight: 1.6 }}>
                  {step}
                </p>
              </motion.div>
            ))}
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--c-border)", display: "flex", justifyContent: "center" }}>
            <a
              href="https://github.com/srujanchidarla/job-hunt-os"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13, color: "var(--c-primary)",
                textDecoration: "none", fontWeight: 500,
              }}
            >
              View source on GitHub →
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
