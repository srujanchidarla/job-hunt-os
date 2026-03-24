"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Which job sites does it work on?",
    a: "LinkedIn, Indeed, Greenhouse, Lever, Workday, and most standard job boards. If the page has a text job description, JobHuntOS can analyze it.",
  },
  {
    q: "Is my resume data safe?",
    a: "Your profile is stored only in your browser (chrome.storage.local). It never leaves your device except when sent to our AI for analysis — and that data is not stored on any server.",
  },
  {
    q: "Do I need a Notion account?",
    a: "Only if you want to save and track applications. The fit score, ATS analysis, bullets, and outreach message all work without Notion.",
  },
  {
    q: "Why is my fit score low?",
    a: "Check the Skills Gap section — it shows exactly which keywords and skills are missing from your resume. Add those to your profile and re-analyze.",
  },
  {
    q: "Is it free?",
    a: "Yes, completely free during beta. No credit card, no account required. Just install and start analyzing.",
  },
  {
    q: "How is this different from resume scanners?",
    a: "Most resume scanners check your existing resume against a static format. JobHuntOS works in real-time on any job posting and generates new tailored content on the spot — every single time.",
  },
  {
    q: "What AI does it use?",
    a: "Claude by Anthropic — currently one of the most accurate AI models for nuanced writing and reasoning tasks.",
  },
  {
    q: "Can I use this for any role?",
    a: "Yes — software engineering, product management, design, data science, any role with a text job description. The AI adapts to the specific requirements.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      style={{ padding: "96px 0", background: "var(--c-surface)", width: "100%" }}
    >
      <div className="wrap">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 56 }}
        >
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              fontWeight: 800,
              color: "#fff",
              marginBottom: 14,
            }}
          >
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: 16, color: "var(--c-muted)" }}>
            Everything you need to know about JobHuntOS.
          </p>
        </motion.div>

        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: "var(--c-surface2)",
                border: "1px solid var(--c-border)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 24px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#fff",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    paddingRight: 16,
                  }}
                >
                  {faq.q}
                </span>
                <ChevronDown
                  size={16}
                  color="var(--c-muted)"
                  style={{
                    flexShrink: 0,
                    transform: open === i ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ padding: "0 24px 20px" }}>
                      <p
                        style={{
                          fontSize: 14,
                          color: "var(--c-muted)",
                          lineHeight: 1.7,
                        }}
                      >
                        {faq.a}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
