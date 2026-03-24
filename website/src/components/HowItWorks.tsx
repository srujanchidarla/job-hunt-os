"use client";

import { motion } from "framer-motion";
import { Globe, Zap, Rocket } from "lucide-react";

const steps = [
  {
    icon: Globe,
    title: "Visit a Job Posting",
    description:
      "Go to any job on LinkedIn, Indeed, Greenhouse, or Lever. JobHuntOS works on all major job boards.",
  },
  {
    icon: Zap,
    title: "Click JobHuntOS",
    description:
      "AI analyzes the job in seconds against your profile. Get your fit score, ATS analysis, and tailored content instantly.",
  },
  {
    icon: Rocket,
    title: "Apply with Confidence",
    description:
      "Use tailored resume bullets, personalized outreach message, and automatic Notion tracking to ace your application.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      style={{ padding: "96px 0", background: "var(--c-bg)", width: "100%" }}
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
              border: "1px solid rgba(0,212,170,0.25)",
              background: "rgba(0,212,170,0.10)",
              color: "var(--c-accent)",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Simple as 1-2-3
          </div>
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontWeight: 800,
              color: "#fff",
              marginBottom: 16,
            }}
          >
            How It Works
          </h2>
          <p
            style={{
              fontSize: 18,
              color: "var(--c-muted)",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            From job posting to tailored application in under 10 seconds.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 32,
            position: "relative",
          }}
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.2 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div style={{ position: "relative", marginBottom: 24 }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 20,
                    background: "var(--c-surface)",
                    border: "1px solid var(--c-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <step.icon size={36} color="var(--c-primary)" />
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    right: -12,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
                  }}
                >
                  {i + 1}
                </div>
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 10,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--c-muted)",
                  lineHeight: 1.65,
                  maxWidth: 260,
                }}
              >
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
