"use client";

import { useEffect, useMemo, useState } from "react";

type ApiResponse = {
  ok: boolean;
  triplej?: {
    url: string;
    nowTitle: string | null;
    artist?: string | null;
    nowImageUrl?: string | null;
  };
  match?: {
    displayTop: string; // `${matched.songTitle} - ${matched.artist}`
    generalActivity: string;
    voterActivity: string;
    voters: string[];
    chosenActivity: string;
  } | null;
  error?: string;
};

function splitTitleArtistFromDisplayTop(displayTop: string | null): { title: string; artist: string } {
  const raw = (displayTop || "").trim();
  if (!raw) return { title: "", artist: "" };

  // displayTop is `${songTitle} - ${artist}` (from SONGS), so keep casing exactly
  const sep = " - ";
  const idx = raw.indexOf(sep);
  if (idx !== -1) {
    return {
      title: raw.slice(0, idx).trim(),
      artist: raw.slice(idx + sep.length).trim(),
    };
  }

  return { title: raw, artist: "" };
}

function splitTitleArtistFallback(nowTitle: string | null, apiArtist?: string | null) {
  const raw = (nowTitle || "").trim();
  if (!raw) return { title: "", artist: apiArtist || "" };

  // If API already gave artist, trust it (best we can do when not matched to SONGS)
  if (apiArtist) return { title: raw, artist: apiArtist || "" };

  // common separators: "Title - Artist", "Title – Artist", "Title — Artist"
  const seps = [" — ", " – ", " - "];
  for (const sep of seps) {
    const idx = raw.indexOf(sep);
    if (idx !== -1) {
      return {
        title: raw.slice(0, idx).trim(),
        artist: raw.slice(idx + sep.length).trim(),
      };
    }
  }

  return { title: raw, artist: "" };
}

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Browser tab title
  useEffect(() => {
    document.title = "Hottest 100 at Dan's";
  }, []);

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

  const activity = useMemo(() => {
    if (!data?.ok) return data?.error ?? "Something went wrong.";
    if (data.match?.chosenActivity) return data.match.chosenActivity;
    return "Waiting for a match…";
  }, [data]);

  const hasVoters = !!(data?.ok && data.match?.voters?.length);

  // Prefer matched (SONGS) title/artist so casing matches your data/songs.ts exactly
  const matchedTop = data?.ok ? data?.match?.displayTop ?? null : null;
  const nowTitle = data?.ok ? data?.triplej?.nowTitle ?? null : null;
  const nowArtistFromApi = data?.ok ? data?.triplej?.artist ?? null : null;

  const { title: heroTitle, artist: heroArtist } = useMemo(() => {
    if (matchedTop) return splitTitleArtistFromDisplayTop(matchedTop);
    return splitTitleArtistFallback(nowTitle, nowArtistFromApi);
  }, [matchedTop, nowTitle, nowArtistFromApi]);

  const heroImg = data?.ok ? data?.triplej?.nowImageUrl ?? null : null;

  return (
    <main style={styles.page}>
      <BackgroundChrome />

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.brandRow}>
            <div style={styles.brandTitle}>Hottest 100 at Dan&apos;s</div>
          </div>

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
          {/* NOW PLAYING HERO CARD */}
          <div style={styles.heroCard}>
            {heroImg && (
              <div
                aria-hidden
                style={{
                  ...styles.heroBg,
                  backgroundImage: `url(${heroImg})`,
                }}
              />
            )}
            <div style={styles.heroOverlay} aria-hidden />

            <div style={styles.heroInner}>
              <div style={styles.heroTop}>
                <div style={hasVoters ? styles.accentChipHot : styles.accentChip}>
                  {hasVoters ? "Voters choose 😈" : "Everyone plays 🎉"}
                </div>
              </div>

              <div style={styles.heroMain}>
                <div style={styles.heroArtWrap}>
                  {heroImg ? (
                    <img src={heroImg} alt="" style={styles.heroArt} />
                  ) : (
                    <div style={styles.heroArtPlaceholder}>♪</div>
                  )}
                </div>

                <div style={styles.heroText}>
                  <div style={styles.heroKicker}>Now playing</div>
                  <div style={styles.heroSongTitle}>
                    {heroTitle || (loading ? "Loading…" : "Waiting…")}
                  </div>
                  {!!heroArtist && <div style={styles.heroArtist}>{heroArtist}</div>}
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

              <div style={styles.heroActivityBlock}>
                <div style={styles.heroActivityLabel}>Game:</div>
                <div style={styles.heroActivityText}>{activity}</div>
              </div>
            </div>
          </div>

          {/* QR CARD */}
          <div style={styles.card}>
            <JoinQr />
          </div>
        </section>

        {/* KEEP TIP FOOTER */}
        <footer style={styles.footer}>
          <div style={styles.footerInner}>
            <span style={styles.footerPill}>Tip</span>
            <span style={styles.footerText}>
              Put this page on the big screen. Guests scan the QR to submit votes on their phone.
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ---------- QR ---------- */

function JoinQr() {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const joinUrl = origin ? `${origin}/join` : "";

  return (
    <div style={styles.qrWrap}>
      <div>
        <div style={styles.cardLabel}>Join + Submit Votes</div>
        <div style={styles.qrTitle}>Scan to join the party</div>
        <div style={styles.qrSub}>Enter your name and choose up to 10 songs you voted for.</div>
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

/* ---------- BACKGROUND ---------- */

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

/* ---------- STYLES ---------- */

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

  // ✅ replaces the old top song title + removes the pill entirely
  brandTitle: {
    fontWeight: 1000,
    fontSize: 44,
    margin: "4px 0 0",
    lineHeight: 1.02,
    letterSpacing: -0.5,
    // "cool coloured stylised text"
    background: "linear-gradient(90deg, rgba(120,210,255,1), rgba(255,122,26,1))",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    textShadow: "0 18px 55px rgba(0,0,0,0.25)",
  },

  subRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 },

  link: { color: "#9EC3FF" },
  dot: { opacity: 0.45 },
  muted: { opacity: 0.78 },

  grid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14 },

  // QR card (right)
  card: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(10px)",
  },

  // HERO CARD (left)
  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(10px)",
    padding: 0,
    minHeight: 360,
  },

  heroBg: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "blur(18px)",
    transform: "scale(1.08)",
    opacity: 0.55,
  },

  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(7,22,44,0.20) 0%, rgba(7,22,44,0.70) 55%, rgba(7,22,44,0.92) 100%)",
  },

  heroInner: {
    position: "relative",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    height: "100%",
  },

  heroTop: {
    display: "flex",
    justifyContent: "flex-end",
  },

  heroMain: {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: 16,
    alignItems: "center",
  },

  heroArtWrap: {
    width: 140,
    height: 140,
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
  },

  heroArt: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  heroArtPlaceholder: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    fontSize: 48,
    opacity: 0.7,
    fontWeight: 900,
  },

  heroText: {
    minWidth: 0,
  },

  heroKicker: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.75,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  heroSongTitle: {
    fontSize: 42,
    fontWeight: 900,
    lineHeight: 1.05,
    marginBottom: 8,
    wordBreak: "break-word",
  },

  heroArtist: {
    fontSize: 18,
    fontWeight: 800,
    opacity: 0.85,
  },

  votersWrap: { marginTop: 6 },

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

  // ✅ Game section: centered top-to-bottom and centered text, even if multi-line
  heroActivityBlock: {
    marginTop: 6,
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    minHeight: 110,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    textAlign: "left",
    gap: 8,
  },

  // sentence case + new wording
  heroActivityLabel: {
    fontSize: 14,
    fontWeight: 900,
    opacity: 0.85,
  },

  heroActivityText: {
    fontSize: 24,
    fontWeight: 900,
    lineHeight: 1.15,
    maxWidth: 640,
  },

  // shared chips/labels
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

  // QR styles
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

  qrImg: {
    width: 200,
    height: 200,
    objectFit: "contain",
    aspectRatio: "1 / 1",
  },

  qrLoading: { color: "#000" },

  qrUrlLabel: { fontSize: 12, marginTop: 6 },

  qrUrl: { wordBreak: "break-all", fontSize: 12 },

  // Tip footer kept
  footer: { marginTop: 20 },

  footerInner: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  footerPill: {
    height: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    fontWeight: 900,
  },

  footerText: { opacity: 0.82 },

  // background chrome
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
    background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, transparent 8px)",
    opacity: 0.12,
  },

  bgVignette: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.45))",
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