"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

export default function BuiltBy() {
  return (
    <section
      style={{ padding: "80px 0", background: "var(--c-bg)", width: "100%" }}
    >
      <div className="wrap">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 20,
            padding: "56px 48px",
            textAlign: "center",
            maxWidth: 640,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#6366f1,#7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>
              SC
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 14px",
              borderRadius: 9999,
              background: "var(--c-surface2)",
              border: "1px solid var(--c-border)",
              fontSize: 12,
              color: "var(--c-muted)",
              marginBottom: 20,
            }}
          >
            Built by a job seeker, for job seekers
          </div>

          <p
            style={{
              fontSize: 15,
              color: "var(--c-muted)",
              lineHeight: 1.75,
              marginBottom: 28,
              maxWidth: 500,
              margin: "0 auto 28px",
            }}
          >
            Hi, I&apos;m{" "}
            <strong style={{ color: "#fff" }}>Srujan</strong> — a Full Stack
            Engineer pursuing my M.S. in Computer Science (GPA 4.0). I built
            JobHuntOS during my own job hunt because I was tired of manually
            tailoring resumes for every application. Now it does it in 3
            seconds.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 28,
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Portfolio", href: "https://srujanchidarla.com" },
              {
                label: "LinkedIn",
                href: "https://www.linkedin.com/in/srujan-chidarla/",
              },
              { label: "GitHub", href: "https://github.com/srujanchidarla" },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 14,
                  color: "var(--c-primary)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                {l.label} <ExternalLink size={13} />
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
