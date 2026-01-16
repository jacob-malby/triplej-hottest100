"use client";

import { useMemo, useState } from "react";
import { SONGS } from "@/app/data/songs";

function norm(s: string) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export default function JoinPage() {
  const [name, setName] = useState("");
  const [voteInputs, setVoteInputs] = useState<string[]>(Array.from({ length: 10 }, () => ""));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const options = useMemo(
    () =>
      SONGS.map((s) => ({
        label: `${s.songTitle} - ${s.artist}`,
        songTitle: s.songTitle,
      })),
    []
  );

  const labelToSongTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of options) m.set(norm(o.label), o.songTitle);
    return m;
  }, [options]);

  function setVote(i: number, v: string) {
    setVoteInputs((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  async function submit() {
    setStatus("saving");
    setErrorMsg("");

    const votes = voteInputs
      .map((v) => labelToSongTitle.get(norm(v)))
      .filter(Boolean) as string[];

    if (!name.trim()) {
      setStatus("error");
      setErrorMsg("Please enter your name/nickname.");
      return;
    }

    if (votes.length === 0) {
      setStatus("error");
      setErrorMsg("Select at least 1 song from the dropdown suggestions.");
      return;
    }

    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, votes: votes.slice(0, 10) }),
    });

    const json = await res.json();

    if (!json.ok) {
      setStatus("error");
      setErrorMsg(json.error || "Could not save votes.");
      return;
    }

    setStatus("saved");
  }

  const headerText =
    status === "saved"
      ? "You’re in ✅"
      : status === "saving"
      ? "Saving…"
      : "Join the party";

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <span style={styles.badge}>HOTTEST 100 • VOTER FORM</span>
          <h1 style={styles.title}>{headerText}</h1>
          <p style={styles.subtitle}>
            Type to search songs, then pick from the dropdown. Submit up to 10 votes.
          </p>
        </header>

        <section style={styles.card}>
          <label style={styles.label}>Name / Nickname</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jacob / Mads / Big Kev"
            style={styles.input}
            autoComplete="nickname"
          />

          <datalist id="songs-list">
            {options.map((o) => (
              <option key={o.label} value={o.label} />
            ))}
          </datalist>

          <div style={styles.votesHeaderRow}>
            <div style={styles.votesTitle}>Your votes</div>
            <div style={styles.votesHint}>Up to 10 (leave blanks if you want)</div>
          </div>

          <div style={styles.votesGrid}>
            {voteInputs.map((v, i) => (
              <div key={i} style={styles.voteRow}>
                <div style={styles.voteNum}>{i + 1}</div>
                <input
                  list="songs-list"
                  value={v}
                  onChange={(e) => setVote(i, e.target.value)}
                  placeholder="Type song or artist…"
                  style={styles.voteInput}
                />
              </div>
            ))}
          </div>

          <button onClick={submit} disabled={status === "saving"} style={styles.button}>
            {status === "saving" ? "Saving…" : "Submit votes"}
          </button>

          {status === "saved" && (
            <div style={styles.success}>
              ✅ Saved! You can close this tab or re-submit anytime to change your votes.
            </div>
          )}

          {status === "error" && <div style={styles.error}>❌ {errorMsg}</div>}

          <div style={styles.tip}>
            <span style={styles.tipDot} />
            <span style={styles.tipText}>
              If you don’t see your song, it’s probably because it isn’t in the party song list yet.
            </span>
          </div>
        </section>

        <footer style={styles.footer}>
          <a href="/" style={styles.backLink}>
            ← Back to main screen
          </a>
        </footer>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#07162C",
    color: "#EAF0FF",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji"',
    padding: "22px 16px 30px",
  },
  shell: {
    maxWidth: 760,
    margin: "0 auto",
  },
  header: {
    marginBottom: 14,
    padding: "8px 6px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    letterSpacing: 0.6,
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 40,
    lineHeight: 1.08,
    margin: "14px 0 8px",
    letterSpacing: -0.6,
    textShadow: "0 12px 40px rgba(0,0,0,0.35)",
    fontWeight: 900,
  },
  subtitle: {
    margin: 0,
    opacity: 0.8,
    lineHeight: 1.5,
    fontSize: 14,
  },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
    padding: 18,
    backdropFilter: "blur(8px)",
  },
  label: {
    display: "block",
    marginTop: 4,
    marginBottom: 8,
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    opacity: 0.9,
  },
  input: {
    width: "100%",
    padding: "12px 12px",
    fontSize: 16,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.07)",
    color: "#EAF0FF",
    outline: "none",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0)",
  },
  votesHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
    marginTop: 16,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  votesTitle: {
    fontWeight: 900,
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    opacity: 0.9,
  },
  votesHint: {
    fontSize: 13,
    opacity: 0.7,
  },
  votesGrid: {
    display: "grid",
    gap: 10,
  },
  voteRow: {
    display: "grid",
    gridTemplateColumns: "34px 1fr",
    gap: 10,
    alignItems: "center",
  },
  voteNum: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: "rgba(255,122,26,0.18)",
    border: "1px solid rgba(255,122,26,0.30)",
    color: "#FFD7B6",
  },
  voteInput: {
    width: "100%",
    padding: "12px 12px",
    fontSize: 16,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.07)",
    color: "#EAF0FF",
    outline: "none",
  },
  button: {
    marginTop: 14,
    width: "100%",
    padding: "13px 14px",
    fontSize: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,122,26,0.35)",
    background: "rgba(255,122,26,0.22)",
    color: "#FFE2C9",
    fontWeight: 900,
    cursor: "pointer",
  },
  success: {
    marginTop: 12,
    padding: "12px 12px",
    borderRadius: 14,
    background: "rgba(120, 255, 173, 0.10)",
    border: "1px solid rgba(120, 255, 173, 0.22)",
    color: "#D9FFE9",
    fontWeight: 800,
    lineHeight: 1.4,
  },
  error: {
    marginTop: 12,
    padding: "12px 12px",
    borderRadius: 14,
    background: "rgba(255, 70, 70, 0.12)",
    border: "1px solid rgba(255, 70, 70, 0.24)",
    color: "#FFE1E1",
    fontWeight: 800,
    lineHeight: 1.4,
  },
  tip: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    opacity: 0.88,
  },
  tipDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "rgba(100,170,255,0.9)",
    boxShadow: "0 0 0 4px rgba(100,170,255,0.15)",
    marginTop: 4,
    flex: "0 0 auto",
  },
  tipText: { fontSize: 13, lineHeight: 1.45, opacity: 0.85 },
  footer: { marginTop: 16, padding: "0 6px" },
  backLink: {
    color: "#A9C6FF",
    textDecoration: "none",
    borderBottom: "1px solid rgba(169,198,255,0.35)",
    fontWeight: 800,
  },
};