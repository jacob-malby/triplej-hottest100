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

            <div style={hasVoters ? styles.activityTextHot : styles.activityText}>
              {activity}
            </div>

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
  const [origin, setOrigin] = useState("");

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
      </div>
    </div>
  );
}

function BackgroundChrome() {
  return (
    <>
      <div style={styles.bgSky} />
      <div style={styles.bgCloudsA} />
      <div style={styles.bgCloudsB} />
      <div style={styles.bgCloudsC} />
      <SunSticker />
      <div style={styles.bgGrain} />
      <div style={styles.bgScan} />
      <div style={styles.bgVignette} />
    </>
  );
}

function SunSticker() {
  return (
    <div style={styles.sunWrap} aria-hidden>
      <div style={styles.sunSlice} />
      <div style={styles.sunRays} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#000e63",
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

  brandRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
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
    lineHeight: "34px",
  },

  pollPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    padding: "0 14px",
    borderRadius: 999,
    background: "rgba(255,122,26,0.22)",
    border: "1px solid rgba(255,122,26,0.30)",
    fontWeight: 800,
    lineHeight: "34px",
  },

  title: { fontSize: 44, fontWeight: 900, margin: "10px 0" },

  subRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },

  link: { color: "#9EC3FF" },

  dot: { opacity: 0.45 },

  muted: { opacity: 0.78 },

  grid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14 },

  card: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(10px)",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardLabel: { fontWeight: 900, fontSize: 12 },

  accentChip: {
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(100,160,255,0.15)",
  },

  accentChipHot: {
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(255,122,26,0.26)",
  },

  votersWrap: { marginTop: 14, marginBottom: 18 },

  votersLabel: {
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 10,
  },

  votersList: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },

  namePillHot: {
    background: "rgba(255,122,26,0.22)",
    border: "1px solid rgba(255,122,26,0.55)",
    fontSize: 20,
    fontWeight: 900,
    padding: "10px 16px",
    borderRadius: 999,
  },

  activityText: { fontSize: 28, fontWeight: 900, marginTop: 16 },

  activityTextHot: { fontSize: 28, fontWeight: 900 },

  tipRow: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#009ad6",
  },

  tipText: { fontSize: 12 },

  qrWrap: { display: "flex", flexDirection: "column", gap: 10 },

  qrTitle: { fontSize: 20, fontWeight: 900 },

  qrSub: { opacity: 0.75 },

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

  footer: { marginTop: 20 },

  footerInner: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  footerPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    padding: "0 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    fontWeight: 900,
  },

  footerText: { opacity: 0.82 },

  bgSky: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(800px 400px at 20% 20%, rgba(0,154,214,0.22), transparent 60%), linear-gradient(#000e63, #000a44)",
  },

  bgCloudsA: {
    position: "absolute",
    inset: "-10%",
    background:
      "radial-gradient(circle at 30% 40%, rgba(0,154,214,0.25), transparent 70%), radial-gradient(circle at 70% 50%, rgba(0,154,214,0.22), transparent 70%)",
    filter: "blur(12px)",
    opacity: 0.5,
  },

  bgCloudsB: {
    position: "absolute",
    inset: "-10%",
    background:
      "repeating-linear-gradient(10deg, rgba(0,154,214,0.12) 0px, transparent 14px)",
    opacity: 0.18,
  },

  bgCloudsC: {
    position: "absolute",
    left: "-15%",
    right: "-15%",
    bottom: "-20%",
    height: "50%",
    background:
      "radial-gradient(circle at 20% 60%, rgba(0,154,214,0.25), transparent 70%), radial-gradient(circle at 80% 60%, rgba(0,154,214,0.20), transparent 70%)",
    filter: "blur(16px)",
  },

  bgGrain: {
    position: "absolute",
    inset: 0,
    background:
      "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, transparent 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 4px)",
    opacity: 0.18,
    mixBlendMode: "overlay",
  },

  bgScan: {
    position: "absolute",
    inset: 0,
    background:
      "repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, transparent 8px)",
    opacity: 0.12,
  },

  bgVignette: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.45))",
  },

  sunWrap: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 160,
    height: 160,
    pointerEvents: "none",
  },

  sunRays: {
    position: "absolute",
    inset: -30,
    borderRadius: 999,
    background:
      "repeating-conic-gradient(rgba(255,122,26,0.0) 0deg 12deg, rgba(255,122,26,0.22) 12deg 14deg)",
    opacity: 0.5,
  },

  sunSlice: {
    position: "absolute",
    inset: 20,
    borderRadius: 999,
    background:
      "radial-gradient(circle, rgba(255,230,180,0.9) 0%, rgba(255,180,90,0.85) 35%, rgba(255,122,26,0.95) 70%, rgba(170,60,10,0.95) 100%), repeating-conic-gradient(rgba(255,240,200,0.3) 0deg 6deg, transparent 6deg 20deg)",
    boxShadow: "0 16px 40px rgba(255,122,26,0.25)",
  },
};