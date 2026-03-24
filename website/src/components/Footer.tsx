import Link from "next/link";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--c-surface)",
        borderTop: "1px solid var(--c-border)",
        width: "100%",
      }}
    >
      <div className="wrap" style={{ padding: "56px 24px 32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "40px 32px",
            marginBottom: 48,
          }}
        >
          {/* Brand */}
          <div>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={16} color="white" fill="white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
                JobHunt
                <span style={{ color: "var(--c-primary)" }}>OS</span>
              </span>
            </Link>
            <p
              style={{
                fontSize: 13,
                color: "var(--c-muted)",
                lineHeight: 1.65,
              }}
            >
              Land your dream job with AI-powered precision.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Product
            </h4>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {[
                { label: "Features", href: "/features" },
                { label: "How it Works", href: "/how-it-works" },
                { label: "Changelog", href: "/changelog" },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    style={{
                      fontSize: 14,
                      color: "var(--c-muted)",
                      textDecoration: "none",
                    }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Legal
            </h4>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    style={{
                      fontSize: 14,
                      color: "var(--c-muted)",
                      textDecoration: "none",
                    }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Support
            </h4>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {[
                { label: "FAQ", href: "/support#faq" },
                { label: "Contact", href: "/support#contact" },
                {
                  label: "GitHub",
                  href: "https://github.com/srujanchidarla/job-hunt-os",
                },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    style={{
                      fontSize: 14,
                      color: "var(--c-muted)",
                      textDecoration: "none",
                    }}
                    target={
                      l.href.startsWith("http") ? "_blank" : undefined
                    }
                    rel={
                      l.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          style={{
            paddingTop: 24,
            borderTop: "1px solid var(--c-border)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 13,
            color: "var(--c-muted)",
          }}
        >
          <span>© 2025 JobHuntOS · Built by Srujan Chidarla</span>
          <div style={{ display: "flex", gap: 20 }}>
            <a
              href="https://srujanchidarla.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--c-muted)", textDecoration: "none" }}
            >
              Portfolio ↗
            </a>
            <a
              href="https://github.com/srujanchidarla"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--c-muted)", textDecoration: "none" }}
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
