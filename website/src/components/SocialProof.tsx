export default function SocialProof() {
  const sites = ["LinkedIn", "Indeed", "Greenhouse", "Lever", "Workday", "AngelList"];

  return (
    <div
      style={{
        background: "var(--c-surface)",
        borderTop: "1px solid var(--c-border)",
        borderBottom: "1px solid var(--c-border)",
        padding: "20px 0",
        width: "100%",
      }}
    >
      <div className="wrap">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px 32px",
            fontSize: 14,
            color: "var(--c-muted)",
          }}
        >
          <span style={{ fontWeight: 700, color: "#fff" }}>Works on →</span>
          {sites.map((site, i) => (
            <span
              key={site}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              {site}
              {i < sites.length - 1 && (
                <span style={{ color: "var(--c-border)", marginLeft: 12 }}>·</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
