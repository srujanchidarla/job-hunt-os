"use client";

import { motion, type Variants, type Transition } from "framer-motion";
import { Zap, ArrowRight, Star } from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.1,
      ease: [0.25, 0.1, 0.25, 1],
    } as Transition,
  }),
};

export default function Hero() {
  return (
    <section
      className="bg-dots"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        background: "var(--c-bg)",
        overflow: "hidden",
      }}
    >
      {/* Glows */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "15%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(99,102,241,0.10)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          right: "10%",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "rgba(0,212,170,0.07)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div className="wrap" style={{ width: "100%", padding: "96px 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "48px",
            alignItems: "center",
          }}
        >
          {/* Left */}
          <div>
            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 9999,
                border: "1px solid rgba(99,102,241,0.25)",
                background: "rgba(99,102,241,0.10)",
                color: "#6366f1",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 24,
              }}
            >
              🏆 Notion MCP Hackathon Project
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              style={{
                fontSize: "clamp(2.2rem, 5vw, 3.75rem)",
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: 24,
                color: "#fff",
              }}
            >
              Land Your Dream Job{" "}
              <span className="gradient-text">with AI-Powered Precision</span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              style={{
                fontSize: 18,
                color: "var(--c-muted)",
                lineHeight: 1.7,
                marginBottom: 32,
                maxWidth: 520,
              }}
            >
              Analyze any job posting in seconds. Get your fit score,
              ATS-optimized resume bullets, and personalized outreach message —
              all tracked automatically in Notion.
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 32,
              }}
            >
              <a
                href="https://chrome.google.com/webstore"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 24px",
                  borderRadius: 9999,
                  background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                  boxShadow: "0 4px 24px rgba(99,102,241,0.35)",
                  transition: "opacity 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.88";
                  e.currentTarget.style.transform = "scale(1.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <Zap size={16} fill="white" color="white" />
                Add to Chrome — It&apos;s Free
              </a>
              <a
                href="#demo"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 24px",
                  borderRadius: 9999,
                  border: "1px solid var(--c-border)",
                  color: "var(--c-muted)",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                  transition: "color 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#fff";
                  e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--c-muted)";
                  e.currentTarget.style.borderColor = "var(--c-border)";
                }}
              >
                Watch Demo <ArrowRight size={16} />
              </a>
            </motion.div>

            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                color: "var(--c-muted)",
              }}
            >
              <div style={{ display: "flex" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="#facc15" color="#facc15" />
                ))}
              </div>
              <span>Built for engineers actively job hunting</span>
            </motion.div>
          </div>

          {/* Right — browser mockup */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              style={{ position: "relative" }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "-16px",
                  borderRadius: 24,
                  background: "rgba(99,102,241,0.18)",
                  filter: "blur(48px)",
                  pointerEvents: "none",
                }}
              />
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: "relative",
                  width: 288,
                  background: "var(--c-surface)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 20,
                  boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                }}
              >
                {/* Browser bar */}
                <div
                  style={{
                    background: "var(--c-surface2)",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    borderBottom: "1px solid var(--c-border)",
                  }}
                >
                  <div style={{ display: "flex", gap: 6 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "rgba(239,68,68,0.6)",
                      }}
                    />
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "rgba(234,179,8,0.6)",
                      }}
                    />
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "rgba(34,197,94,0.6)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: "var(--c-bg)",
                      borderRadius: 6,
                      padding: "4px 12px",
                      fontSize: 11,
                      color: "var(--c-muted)",
                      textAlign: "center",
                    }}
                  >
                    linkedin.com/jobs/…
                  </div>
                </div>

                {/* Sidebar content */}
                <div
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Zap size={12} color="white" fill="white" />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                      JobHunt
                      <span style={{ color: "var(--c-primary)" }}>OS</span>
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}
                      >
                        Staff Software Engineer
                      </div>
                      <div style={{ fontSize: 11, color: "var(--c-muted)" }}>
                        @ Walmart
                      </div>
                    </div>
                    <div style={{ position: "relative", width: 48, height: 48 }}>
                      <svg
                        viewBox="0 0 40 40"
                        style={{
                          width: "100%",
                          height: "100%",
                          transform: "rotate(-90deg)",
                        }}
                      >
                        <circle
                          cx="20"
                          cy="20"
                          r="15"
                          fill="none"
                          stroke="#2a2a3a"
                          strokeWidth="3"
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r="15"
                          fill="none"
                          stroke="#00d4aa"
                          strokeWidth="3"
                          strokeDasharray="94.2"
                          strokeDashoffset={94.2 - (92 / 100) * 94.2}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--c-accent)",
                        }}
                      >
                        92
                      </span>
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 9999,
                        background: "rgba(99,102,241,0.15)",
                        border: "1px solid rgba(99,102,241,0.25)",
                        color: "#6366f1",
                        fontWeight: 600,
                      }}
                    >
                      ATS Score: 78
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {[
                      "Scaled microservices handling 2M+ req/day...",
                      "Reduced latency by 40% via caching...",
                      "Led team of 6 engineers, 3 sprints...",
                    ].map((b, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          fontSize: 11,
                          color: "var(--c-muted)",
                        }}
                      >
                        <div
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: "var(--c-primary)",
                            marginTop: 5,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      padding: "6px 0",
                      textAlign: "center",
                      borderRadius: 8,
                      background: "rgba(99,102,241,0.18)",
                      border: "1px solid rgba(99,102,241,0.30)",
                      color: "#6366f1",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    Save to Notion ✓
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
