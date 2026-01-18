"use client";

import { useEffect, useState } from "react";

export default function SuccessPage() {
  const [name, setName] = useState("");

  useEffect(() => {
    document.title = "You’re in • Hottest 100 in Figtree";

    // ✅ window-safe: only runs in the browser
    const sp = new URLSearchParams(window.location.search);
    setName((sp.get("name") || "").trim());
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.card}>
          <div style={styles.badge}>HOTTEST 100 IN FIGTREE</div>

          <h1 style={styles.title}>You’re in ✅</h1>

          <p style={styles.subtitle}>
            {name ? (
              <>
                Thanks, <span style={styles.nameEmph}>{name}</span> — your votes are saved.
              </>
            ) : (
              <>Your votes are saved.</>
            )}
          </p>

          <div style={styles.bigMessage}>Now, get to partying! 🎉</div>

          <div style={styles.tipBox}>
            <div style={styles.tipLabel}>Need to change anything?</div>
            <div style={styles.tipText}>
              Hit the button below to edit your votes — your form will be pre-filled.
            </div>
          </div>

          <a href="/join?edit=1" style={styles.primaryBtn}>
            Edit my votes
          </a>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#07162C",
    color: "#EAF0FF",
    padding: 16,
    display: "grid",
    placeItems: "center",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji"',
  },
  shell: { width: "100%", maxWidth: 720 },
  card: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    padding: "0 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  title: { fontSize: 40, fontWeight: 950, margin: "14px 0 8px" },
  subtitle: { opacity: 0.86, fontSize: 16, margin: 0, lineHeight: 1.45 },
  nameEmph: { fontWeight: 900 },
  bigMessage: { marginTop: 12, fontSize: 22, fontWeight: 950, letterSpacing: -0.2 },
  tipBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    background: "rgba(0,154,214,0.10)",
    border: "1px solid rgba(0,154,214,0.22)",
  },
  tipLabel: { fontWeight: 900, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" },
  tipText: { marginTop: 6, opacity: 0.9, lineHeight: 1.5 },
  primaryBtn: {
    marginTop: 16,
    display: "block",
    textDecoration: "none",
    textAlign: "center",
    padding: "14px 14px",
    borderRadius: 18,
    border: "1px solid rgba(255,122,26,0.35)",
    background: "rgba(255,122,26,0.22)",
    color: "#FFE2C9",
    fontWeight: 950,
    fontSize: 16,
  },
};