"use client";

import { motion } from "framer-motion";
import {
  Target,
  ShieldCheck,
  FileEdit,
  Sparkles,
  Send,
  Database,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Fit Score (0–100)",
    description:
      "See exactly how well your profile matches the role. Green = strong match. Red = significant gaps to address.",
    iconColor: "#00d4aa",
    iconBg: "rgba(0,212,170,0.12)",
    iconBorder: "rgba(0,212,170,0.25)",
  },
  {
    icon: ShieldCheck,
    title: "ATS Analysis",
    description:
      "Keyword match, format check, and human writing score. Know if your resume will pass automated screening before you apply.",
    iconColor: "#6366f1",
    iconBg: "rgba(99,102,241,0.12)",
    iconBorder: "rgba(99,102,241,0.25)",
  },
  {
    icon: FileEdit,
    title: "Tailored Resume Bullets",
    description:
      "3 resume bullets rewritten specifically for THIS job, with your metrics and their keywords woven in naturally.",
    iconColor: "#60a5fa",
    iconBg: "rgba(96,165,250,0.12)",
    iconBorder: "rgba(96,165,250,0.25)",
  },
  {
    icon: Sparkles,
    title: "Humanize AI Writing",
    description:
      "One click rewrites AI-sounding text into natural human voice — keeps all metrics, removes robotic language.",
    iconColor: "#facc15",
    iconBg: "rgba(250,204,21,0.12)",
    iconBorder: "rgba(250,204,21,0.25)",
  },
  {
    icon: Send,
    title: "Personalized Outreach",
    description:
      "LinkedIn outreach message written for this specific role and company. Ready to copy and send in one click.",
    iconColor: "#f472b6",
    iconBg: "rgba(244,114,182,0.12)",
    iconBorder: "rgba(244,114,182,0.25)",
  },
  {
    icon: Database,
    title: "Notion Job Tracker",
    description:
      "Every application saved to your Notion workspace automatically. Full pipeline: To Apply → Interviewing → Offer.",
    iconColor: "#fb923c",
    iconBg: "rgba(251,146,60,0.12)",
    iconBorder: "rgba(251,146,60,0.25)",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      style={{ padding: "96px 0", background: "var(--c-surface)", width: "100%" }}
    >
      <div className="wrap">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 64 }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 9999,
              border: "1px solid rgba(99,102,241,0.25)",
              background: "rgba(99,102,241,0.10)",
              color: "var(--c-primary)",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Powered by Claude AI + Notion MCP
          </div>
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontWeight: 800,
              color: "#fff",
              marginBottom: 16,
            }}
          >
            Everything you need to land the job
          </h2>
          <p
            style={{
              fontSize: 18,
              color: "var(--c-muted)",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            From job analysis to Notion tracking — all in one Chrome extension.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="card-hover"
              style={{
                padding: 24,
                borderRadius: 16,
                background: "var(--c-surface2)",
                border: "1px solid var(--c-border)",
                cursor: "default",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: f.iconBg,
                  border: `1px solid ${f.iconBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <f.icon size={20} color={f.iconColor} />
              </div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 10,
                }}
              >
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: "var(--c-muted)", lineHeight: 1.65 }}>
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
