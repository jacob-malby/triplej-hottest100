"use client";

import { useEffect, useMemo, useState } from "react";

type ApiResponse = {
  ok: boolean;
  triplej?: { url: string; nowTitle: string | null };
  match?: {
    displayTop: string;
    generalActivity: string;
    voterActivity: string;
    voters: string[];
    chosenActivity: string;
  } | null;
  error?: string;
};

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const pollMs = 4000;

  useEffect(() => {
    let cancelled = false;
    let timer: any;

    async function tick() {
      try {
        const qs = window.location.search || "";
        const res = await fetch(`/api/now-playing${qs}`, { cache: "no-store" });
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setData({ ok: false, error: e?.message ?? "Fetch failed" });
          setLoading(false);
        }
      } finally {
        if (!cancelled) timer = setTimeout(tick, pollMs);
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const topLine = useMemo(() => {
    if (loading) return "Loading…";
    if (!data?.ok) return "Uh oh";
    if (data.match) return data.match.displayTop;
    if (data.triplej?.nowTitle) return `No match yet: ${data.triplej.nowTitle}`;
    return "Waiting for the live song…";
  }, [data, loading]);

  const activity = useMemo(() => {
    if (!data?.ok) return data?.error ?? "Something went wrong.";
    if (data.match?.chosenActivity) return data.match.chosenActivity;
    return "Waiting for a match…";
  }, [data]);

  const hasVoters = !!(data?.ok && data.match?.voters?.length);

  return (
    <main style={styles.page}>
      <BackgroundChrome />

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.brandRow}>
            <span style={styles.badge}>HOTTEST 100 PARTY MODE</span>
            <span style={styles.pollPill}>
              Live-ish • polls every {Math.round(pollMs / 1000)}s
            </span>
          </div>

          <h1 style={styles.title}>{topLine}</h1>

          <div style={styles.subRow}>
            <a
              href="https://www.abc.net.au/triplej/countdown/hottest100"
              target="_blank"
              rel="noreferrer"
              style={styles.link}
            >
              Source: triplej countdown
            </a>
            <span style={styles.dot}>•</span>
            <span style={styles.muted}>
              {data?.ok
                ? data?.triplej?.nowTitle
                  ? `Detected: “${data.triplej.nowTitle}”`
                  : "No title detected yet"
                : "API error"}
            </span>
          </div>
        </header>

        <section style={styles.grid}>
          {/* ACTIVITY CARD */}
          <div style={styles.card}>
            <div style={styles.cardTop}>
              <div style={styles.cardLabel}>
                {hasVoters ? "VOTER ACTIVITY" : "GENERAL ACTIVITY"}
              </div>
              <div style={hasVoters ? styles.accentChipHot : styles.accentChip}>
                {hasVoters ? "Someone voted 😈" : "Everyone plays 🎉"}
              </div>
            </div>

            {/* VOTERS FIRST */}
            {hasVoters && (
              <div style={styles.votersWrap}>
                <div style={styles.votersLabel}>Voted by</div>
                <div style={styles.votersList}>
                  {data!.match!.voters.map((name) => (
                    <span key={name} style={styles.namePillHot}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVITY TEXT (NORMAL STYLE ALWAYS) */}
            <div style={styles.activityText}>{activity}</div>

            {!hasVoters && (
              <div style={styles.tipRow}>
                <span style={styles.tipDot} />
                <span style={styles.tipText}>
                  If anyone voted for the current song, this card switches to voter activity + names.
                </span>
              </div>
            )}
          </div>

          {/* QR CARD */}
          <div style={styles.card}>
            <JoinQr />
          </div>
        </section>

        <footer style={styles.footer}>
          <div style={styles.footerInner}>
            <span style={styles.footerPill}>Tip</span>
            <span style={styles.footerText}>
              Put this tab on the big screen. Guests scan the QR to submit votes on their phone.
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function JoinQr() {
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const joinUrl = origin ? `${origin}/join` : "";

  return (
    <div style={styles.qrWrap}>
      <div>
        <div style={styles.cardLabel}>JOIN + SUBMIT VOTES</div>
        <div style={styles.qrTitle}>Scan to join the party</div>
        <div style={styles.qrSub}>
          Enter your name and choose up to 10 songs you voted for.
        </div>
      </div>

      <div style={styles.qrBody}>
        <div style={styles.qrBox}>
          {joinUrl ? (
            <img
              alt="QR code"
              src={`/api/qr?data=${encodeURIComponent(joinUrl)}`}
              style={styles.qrImg}
            />
          ) : (
            <div style={styles.qrLoading}>Generating QR…</div>
          )}
        </div>

        <div>
          <div style={styles.qrUrlLabel}>Join link</div>
          <div style={styles.qrUrl}>{joinUrl || "…"}</div>
        </div>
      </div>
    </div>
  );
}

function BackgroundChrome() {
  return (
    <>
      <div style={styles.bgTopGlow} />
      <div style={styles.bgBottomGlow} />
      <div style={styles.bgNoise} />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#07162C",
    color: "#EAF0FF",
    position: "relative",
    overflow: "hidden",
  },
  shell: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: 24,
    position: "relative",
    zIndex: 2,
  },
  header: { marginBottom: 20 },
  brandRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  badge: {
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.1)",
    fontWeight: 800,
    fontSize: 12,
  },
  pollPill: {
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(255,122,26,0.2)",
    fontWeight: 700,
  },
  title: { fontSize: 44, fontWeight: 900, margin: "10px 0" },
  subRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  link: { color: "#9EC3FF" },
  dot: { opacity: 0.4 },
  muted: { opacity: 0.7 },

  grid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14 },

  card: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.1)",
  },

  cardTop: { display: "flex", justifyContent: "space-between" },
  cardLabel: { fontWeight: 800, fontSize: 12 },

  accentChip: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(100,160,255,0.15)",
  },
  accentChipHot: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(255,122,26,0.3)",
  },

  activityText: {
    fontSize: 28,
    fontWeight: 900,
    marginTop: 14,
  },

  votersWrap: {
    marginTop: 10,
    marginBottom: 12,
  },

  votersLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: 800,
    marginBottom: 8,
    opacity: 0.85,
  },

  votersList: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  namePillHot: {
    background: "rgba(255,122,26,0.25)",
    border: "1px solid rgba(255,122,26,0.5)",
    color: "#FFE1C4",
    fontSize: 20,
    fontWeight: 900,
    padding: "10px 16px",
    borderRadius: 999,
    boxShadow: "0 8px 22px rgba(255,122,26,0.3)",
  },

  tipRow: { marginTop: 12, opacity: 0.7 },
  tipDot: { display: "none" },
  tipText: { fontSize: 12 },

  qrWrap: { display: "flex", flexDirection: "column", gap: 10 },
  qrTitle: { fontSize: 20, fontWeight: 900 },
  qrSub: { opacity: 0.7 },

  qrBody: { display: "flex", gap: 14 },
  qrBox: {
    width: 220,
    height: 220,
    background: "#fff",
    display: "grid",
    placeItems: "center",
    borderRadius: 14,
  },
  qrImg: { width: 200, height: 200 },

  qrLoading: { color: "#000" },

  qrUrlLabel: { fontSize: 12, marginTop: 6 },
  qrUrl: { wordBreak: "break-all", fontSize: 12 },

  footer: { marginTop: 20 },
  footerInner: { display: "flex", gap: 10 },
  footerPill: {
    background: "rgba(255,255,255,0.1)",
    padding: "6px 10px",
    borderRadius: 999,
  },
  footerText: { opacity: 0.8 },

  bgTopGlow: {
    position: "absolute",
    inset: "-30% -20% auto -20%",
    height: "60%",
    background:
      "radial-gradient(closest-side, rgba(255,122,26,0.35), transparent 70%)",
  },
  bgBottomGlow: {
    position: "absolute",
    inset: "auto -20% -30% -20%",
    height: "60%",
    background:
      "radial-gradient(closest-side, rgba(80,140,255,0.3), transparent 70%)",
  },
  bgNoise: {
    position: "absolute",
    inset: 0,
    opacity: 0.08,
  },
};