"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SONGS } from "@/app/data/songs";

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

type Option = {
  label: string;
  songTitle: string;
  artist: string;
  haystack: string;
  key: string; // normalized unique key for song
};

const STORAGE_KEY = "h100figtree:joinDraft:v1";

// ---------- RANDOMISE CONFIG ----------
const ALLOWED_TITLES = new Set(
  [
    "Man I Need",
    "Dancing2",
    "Keith",
    "Dracula",
    "iPod Touch",
    "WHERE IS MY HUSBAND",
    "Whateverrrr",
    "No Broke Boys",
    "12 to 12",
    "Dreamin",
    "Nice To Each Other",
    "Disco Cowgirl",
    "Victory Lap",
    "The Subway",
    "Anxiety",
    "back to friends",
    "Fame is a Gun",
    "undressed",
    "Love Balloon",
    "Please Don't Move To Melbourne",
    "Sally, When The Wine Runs Out",
    "Berghain",
    "Illegal",
    "car",
    "Melodramatic Fanatic",
    "Pussy Palace",
    "So Easy [To Fall In Love]",
    "What Was That",
    "you're a star",
    "In Another Life",
    "Rein Me In",
    "Sports car",
    "H.O.O.D - 2025 Mix",
    "Khe Sanh [Like A Version]",
    "Pavement",
    "Shut You Out",
    "Sugar On My Tongue",
    "The Fate of Ophelia",
    "A COLD PLAY",
    "BALCONY",
    "Basic Being Basic",
    "DEATH CULT ZOMBIE",
    "Ordinary",
    "Backseat",
    "mangetout",
    "Parachute",
    "Cry For Me",
    "Jealous Type",
    "One Thing",
    "Stay",
    "It Gets Better [Forever Mix]",
    "NOKIA",
    "NOT OK",
    "DtMF",
    "I Write Sins Not Tragedies [triple j Like A Version 2025]",
    "PEACE",
    "Bloom Baby Bloom",
    "If It Makes You Happy [triple j Like A Version 2025]",
    "Relationships",
    "Ashes to Ashes [triple j Like A Version 2025]",
    "Can You Feel My Heart [triple j Like A Version 2025]",
  ].map(norm)
);

function randInt(maxExclusive: number) {
  if (maxExclusive <= 0) return 0;
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % maxExclusive;
}

export default function JoinPage() {
  const [name, setName] = useState("");
  const [voteInputs, setVoteInputs] = useState<string[]>(Array.from({ length: 10 }, () => ""));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");


  const options = useMemo<Option[]>(() => {
    return SONGS.map((s) => {
      const label = `${s.songTitle} - ${s.artist}`;
      return {
        label,
        songTitle: s.songTitle,
        artist: s.artist,
        haystack: norm(`${s.songTitle} ${s.artist}`),
        key: norm(label), // stable enough for "already selected" checks
      };
    });
  }, []);
    const allowedOptions = useMemo(() => {
    // match using normalised SONGS songTitle
    return options.filter((o) => ALLOWED_TITLES.has(norm(o.songTitle)));
  }, [options]);

  const labelToSongTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of options) m.set(norm(o.label), o.songTitle);
    return m;
  }, [options]);

    const hasAtLeastOneSelection = useMemo(() => {
    return voteInputs.some((v) => labelToSongTitle.has(norm(v)));
  }, [voteInputs, labelToSongTitle]);
  
    const isFullyFilled = useMemo(() => {
    return voteInputs.filter((v) => labelToSongTitle.has(norm(v))).length >= 10;
  }, [voteInputs, labelToSongTitle]);


  function randomiseVotes() {
    setVoteInputs((prev) => {
      const next = [...prev];

      // track used song keys based on existing labels in the inputs
      const usedKeys = new Set<string>();
      for (const v of next) {
        const k = norm(v);
        if (k) usedKeys.add(k);
      }

      // pool = allowed songs minus already used
      const pool = allowedOptions.filter((o) => !usedKeys.has(o.key));

      // fill empty rows only
      for (let i = 0; i < 10; i++) {
        if ((next[i] || "").trim()) continue;
        if (pool.length === 0) break;

        const j = randInt(pool.length);
        const pick = pool[j];
        next[i] = pick.label;

        // remove to avoid duplicates
        pool.splice(j, 1);
      }

      return next;
    });
  }

  // ✅ Determine which song-keys are already selected across the whole form
  const selectedKeysByIndex = useMemo(() => {
    return voteInputs.map((v) => {
      const k = norm(v);
      return k || "";
    });
  }, [voteInputs]);

  function setVote(i: number, v: string) {
    setVoteInputs((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  // ✅ Prefill for edit mode
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const wantsEdit = sp.get("edit") === "1";
    if (!wantsEdit) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { name?: string; voteInputs?: string[] };
      const storedName = (parsed?.name || "").toString();
      const storedVotes = Array.isArray(parsed?.voteInputs) ? parsed.voteInputs.map(String) : [];

      const isEmptyNow = !name.trim() && voteInputs.every((v) => !v || !v.trim());
      if (isEmptyNow) {
        setName(storedName);
        setVoteInputs((prev) => {
          const next = [...prev];
          for (let i = 0; i < 10; i++) next[i] = storedVotes[i] || "";
          return next;
        });
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setStatus("saving");
    setErrorMsg("");

    // Resolve selected songTitles
    const resolved = voteInputs
      .map((v) => labelToSongTitle.get(norm(v)))
      .filter(Boolean) as string[];

    if (!name.trim()) {
      setStatus("error");
      setErrorMsg("Please enter your name.");
      return;
    }

    if (resolved.length === 0) {
      setStatus("error");
      setErrorMsg("Select at least 1 song.");
      return;
    }

    // ✅ Duplicate protection (in case user typed manually)
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const t of resolved) {
      const k = norm(t);
      if (seen.has(k)) dupes.push(t);
      seen.add(k);
    }
    if (dupes.length > 0) {
      setStatus("error");
      setErrorMsg("You can’t vote for the same song twice. Remove the duplicate and try again.");
      return;
    }

    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, votes: resolved.slice(0, 10) }),
    });

    const json = await res.json();

    if (!json.ok) {
      setStatus("error");
      setErrorMsg(json.error || "Could not save votes.");
      return;
    }

    // Save draft for prefill on edit
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim(), voteInputs }));
    } catch {}

    setStatus("saved");

    window.location.assign(`/success?name=${encodeURIComponent(name.trim())}`);
  }

  const headerText = status === "saving" ? "Saving…" : "Join the party";

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <h1 style={styles.title}>{headerText}</h1>
          <p style={styles.subtitle}>
            Click/tap a row to type or hit the arrow to open the full song list.
          </p>
        </header>

        <section style={styles.card}>
          <div style={styles.nameHeader}>Name:</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type your name or nickname..."
            style={styles.input}
            inputMode="text"
            autoComplete="nickname"
          />

          <button
            type="button"
            onClick={randomiseVotes}
            disabled={isFullyFilled}
            style={{
              ...styles.randomBtn,
              opacity: isFullyFilled ? 0.5 : 1,
              cursor: isFullyFilled ? "not-allowed" : "pointer",
            }}
          >
            {isFullyFilled
              ? "⬇️ Now, submit your votes!"
              : `🎲 ${hasAtLeastOneSelection ? "Randomise the rest of my votes" : "Randomise my votes"}`}
          </button>

          <div style={styles.votesHeaderRow}>
            <div style={styles.votesTitle}>Your votes:</div>
            <div style={styles.votesHint}>Up to 10</div>
          </div>

          <div style={styles.votesGrid}>
            {voteInputs.map((v, i) => (
              <VotePickerRow
                key={i}
                index={i}
                value={v}
                onChange={(next) => setVote(i, next)}
                options={options}
                selectedKeysByIndex={selectedKeysByIndex}
              />
            ))}
          </div>

          <button onClick={submit} disabled={status === "saving"} style={styles.button}>
            {status === "saving" ? "Saving…" : "Submit votes"}
          </button>

          {status === "error" && <div style={styles.error}>❌ {errorMsg}</div>}
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

/* ---------- PICKER ROW ---------- */

function VotePickerRow({
  index,
  value,
  onChange,
  options,
  selectedKeysByIndex,
}: {
  index: number;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  selectedKeysByIndex: string[];
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
    const isExactOption = useMemo(() => {
    const k = norm(value);
    if (!k) return false;
    return options.some((o) => o.key === k);
  }, [value, options]);

  const myKey = norm(value);
  const selectedElsewhere = useMemo(() => {
    const s = new Set<string>();
    selectedKeysByIndex.forEach((k, i) => {
      if (!k) return;
      if (i === index) return; // allow current row's selection
      s.add(k);
    });
    return s;
  }, [selectedKeysByIndex, index]);

  // ✅ Full list when empty; filtered when typing; minus already-selected songs
  const filtered = useMemo(() => {
    const q = norm(value);

    const base = !q
      ? options
      : options
          .map((o) => ({ o, idx: o.haystack.indexOf(q) }))
          .filter((x) => x.idx !== -1)
          .sort((a, b) => a.idx - b.idx)
          .slice(0, 200)
          .map((x) => x.o);

    // remove already-selected elsewhere
    return base.filter((o) => !selectedElsewhere.has(o.key) || o.key === myKey);
  }, [value, options, selectedElsewhere, myKey]);

  function openPickerFocus() {
    setOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const el = inputRef.current;
      if (el) {
        const len = el.value.length;
        try {
          el.setSelectionRange(len, len);
        } catch {}
      }
    });
  }

  function choose(label: string) {
    onChange(label);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;

    function onPointer(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target || !rowRef.current) return;
      if (!rowRef.current.contains(target)) setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rowRef} style={styles.voteRow}>
      <div style={styles.voteNum}>{index + 1}</div>

      <div style={styles.voteField}>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (!isExactOption) setOpen(true);
          }}
          onClick={() => {
            if (!isExactOption) setOpen(true);
          }}
          placeholder="Search song or artist…"
          style={styles.voteInput}
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
        />
        {isExactOption && value.trim() && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={(e) => {
              e.preventDefault();
              onChange("");
              setOpen(false);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            style={styles.clearBtn}
          >
            <span style={styles.clearX}>×</span>
          </button>
        )}
        <button
          type="button"
          aria-label={open ? "Close song list" : "Open song list"}
          onClick={(e) => {
            e.preventDefault();
            if (open) {
              setOpen(false);
              requestAnimationFrame(() => inputRef.current?.focus());
            } else {
              openPickerFocus();
            }
          }}
          style={styles.dropdownBtn}
        >
          <span
            style={{
              ...styles.dropdownIconWrap,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <ChevronDown />
          </span>
        </button>

        {open && (
          <div style={styles.dropdown}>
            {filtered.length === 0 ? (
              <div style={styles.dropdownEmpty}>No matches</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  style={styles.dropdownItem}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o.label)}
                >
                  <div style={styles.dropdownMain}>{o.songTitle}</div>
                  <div style={styles.dropdownSub}>{o.artist}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: "block" }} aria-hidden>
      <path
        d="M6.7 9.2a1 1 0 0 1 1.4 0L12 13.1l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.6a1 1 0 0 1 0-1.4z"
        fill="currentColor"
      />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#07162C",
    color: "#EAF0FF",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji"',
    padding: 16,
  },
  shell: { maxWidth: 760, margin: "0 auto" },
  header: { marginBottom: 14 },
  title: { fontSize: 40, fontWeight: 900, margin: "0 0 8px" },
  subtitle: { opacity: 0.8, fontSize: 16, margin: 0 },

  card: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
  },

  label: {
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  input: {
    width: "100%",
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.07)",
    color: "#EAF0FF",
    outline: "none",
    fontSize: 16,
  },

  votesHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 10,
  },

  votesTitle: { fontWeight: 900, fontSize: 18 },
    nameHeader: {
    fontWeight: 900,
    fontSize: 18,
    marginTop: 16,
    marginBottom: 6,
  },
  votesHint: { opacity: 0.7 },
  votesGrid: { display: "grid", gap: 14 },

  voteRow: { display: "grid", gridTemplateColumns: "44px 1fr", gap: 12 },

  voteNum: {
    width: 44,
    height: 44,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: "rgba(255,122,26,0.18)",
    border: "1px solid rgba(255,122,26,0.30)",
    color: "#FFD7B6",
  },

  voteField: { position: "relative" },

  voteInput: {
    width: "100%",
    padding: "14px 98px 14px 14px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.07)",
    color: "#EAF0FF",
    outline: "none",
    fontSize: 18,
  },

  dropdownBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 54,
    height: "100%",
    border: "none",
    background: "rgba(255,255,255,0.06)",
    color: "#EAF0FF",
    borderLeft: "1px solid rgba(255,255,255,0.10)",
    borderRadius: "0 18px 18px 0",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
    padding: 0,
  },
  
  clearBtn: {
    position: "absolute",
    right: 54, // sits just to the left of dropdownBtn
    top: 0,
    width: 44,
    height: "100%",
    border: "none",
    background: "transparent",
    color: "rgba(234,240,255,0.65)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
    padding: 0,
  },

  clearX: {
    fontSize: 22,
    fontWeight: 900,
    transform: "translateY(-1px)",
    opacity: 0.8,
  },

  dropdownIconWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    transition: "transform 180ms ease",
    willChange: "transform",
  },

  dropdown: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(100% + 10px)",
    borderRadius: 16,
    background: "rgba(8,20,44,0.96)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 18px 55px rgba(0,0,0,0.42)",
    maxHeight: 360,
    overflowY: "auto",
    zIndex: 50,
  },

  dropdownItem: {
    width: "100%",
    padding: "12px 14px",
    background: "transparent",
    border: "none",
    textAlign: "left",
    color: "#EAF0FF",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer",
  },

  dropdownMain: { fontWeight: 900 },
  dropdownSub: { fontSize: 13, opacity: 0.7 },
  dropdownEmpty: { padding: 14, opacity: 0.8 },

  button: {
    marginTop: 16,
    width: "100%",
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,122,26,0.35)",
    background: "rgba(255,122,26,0.22)",
    color: "#FFE2C9",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 18,
  },
    randomBtn: {
    marginTop: 16,
    width: "100%",
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,122,26,0.35)",
    background: "rgba(255,122,26,0.22)",
    color: "#FFE2C9",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 18,
  },


  error: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,70,70,0.12)",
    border: "1px solid rgba(255,70,70,0.24)",
    fontWeight: 800,
  },

  footer: { marginTop: 16 },
  backLink: {
    color: "#A9C6FF",
    textDecoration: "none",
    borderBottom: "1px solid rgba(169,198,255,0.35)",
    fontWeight: 800,
  },
};