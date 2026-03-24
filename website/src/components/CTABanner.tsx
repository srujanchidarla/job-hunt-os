"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export default function CTABanner() {
  return (
    <section
      style={{ padding: "96px 0", background: "var(--c-bg)", width: "100%" }}
    >
      <div className="wrap">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-dots"
          style={{
            position: "relative",
            borderRadius: 24,
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #4338ca 0%, #6366f1 40%, #7c3aed 100%)",
            textAlign: "center",
            padding: "80px 40px",
          }}
        >
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <Zap size={28} color="white" fill="white" />
            </div>
            <h2
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                fontWeight: 800,
                color: "#fff",
                marginBottom: 16,
              }}
            >
              Ready to land your dream job?
            </h2>
            <p
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.75)",
                marginBottom: 36,
                maxWidth: 400,
                margin: "0 auto 36px",
              }}
            >
              Add JobHuntOS to Chrome — free forever during beta
            </p>
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 32px",
                borderRadius: 9999,
                background: "#fff",
                color: "#4338ca",
                fontWeight: 700,
                fontSize: 15,
                textDecoration: "none",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.04)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <Zap size={16} color="#4338ca" /> Add to Chrome — It&apos;s Free
            </a>
            <p
              style={{
                marginTop: 20,
                fontSize: 13,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              No account required · Works in 30 seconds
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
