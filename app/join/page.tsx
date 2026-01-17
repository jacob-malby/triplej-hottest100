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
};

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
      };
    });
  }, []);

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
      setErrorMsg("Please enter your name.");
      return;
    }

    if (votes.length === 0) {
      setStatus("error");
      setErrorMsg("Select at least 1 song.");
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
    status === "saved" ? "You’re in ✅" : status === "saving" ? "Saving…" : "Join the party";

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <h1 style={styles.title}>{headerText}</h1>
          <p style={styles.subtitle}>
            Tap a row to type — or hit the arrow to open the full song list.
          </p>
        </header>

        <section style={styles.card}>
          <label style={styles.label}>Name / Nickname</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cob / Jacob"
            style={styles.input}
            inputMode="text"
            autoComplete="nickname"
          />

          <div style={styles.votesHeaderRow}>
            <div style={styles.votesTitle}>Your votes</div>
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
              />
            ))}
          </div>

          <button onClick={submit} disabled={status === "saving"} style={styles.button}>
            {status === "saving" ? "Saving…" : "Submit votes"}
          </button>

          {status === "saved" && (
            <div style={styles.success}>✅ Saved! You can re-submit anytime.</div>
          )}

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

function VotePickerRow({
  index,
  value,
  onChange,
  options,
}: {
  index: number;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = norm(value);
    if (!q) return options.slice(0, 60);

    return options
      .map((o) => ({ o, idx: o.haystack.indexOf(q) }))
      .filter((x) => x.idx !== -1)
      .sort((a, b) => a.idx - b.idx)
      .slice(0, 80)
      .map((x) => x.o);
  }, [value, options]);

  function openPickerFocus() {
    setOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const el = inputRef.current;
      if (el) {
        const len = el.value.length;
        try {
          el.setSelectionRange(len, len);
        } catch {
          // ignore
        }
      }
    });
  }

  function choose(label: string) {
    onChange(label);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  // Close when clicking outside (pointer covers mouse + touch)
  useEffect(() => {
    if (!open) return;

    function onPointer(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!rowRef.current) return;

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
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder="Search song or artist…"
          style={styles.voteInput}
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
        />

        <button
          type="button"
          aria-label="Open song list"
          onClick={(e) => {
            e.preventDefault();
            openPickerFocus(); // ✅ force open + focus (cursor/keyboard)
          }}
          style={styles.dropdownBtn}
        >
          <ChevronDown />
        </button>

        {/* ✅ FIX: dropdown is inside voteField and absolutely positioned */}
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
                  onMouseDown={(e) => e.preventDefault()} // keep input focused
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
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden focusable="false">
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
    padding: "16px",
  },

  shell: { maxWidth: 760, margin: "0 auto" },

  header: { marginBottom: 14 },
  title: { fontSize: 40, fontWeight: 900, margin: "0 0 8px" },
  subtitle: { opacity: 0.8, fontSize: 16, margin: 0, lineHeight: 1.4 },

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
    opacity: 0.9,
  },

  input: {
    width: "100%",
    padding: "12px",
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
    alignItems: "baseline",
  },

  votesTitle: { fontWeight: 900, fontSize: 18 },
  votesHint: { opacity: 0.7, fontSize: 16 },

  votesGrid: { display: "grid", gap: 14 },

  voteRow: {
    display: "grid",
    gridTemplateColumns: "44px 1fr",
    gap: 12,
    alignItems: "start",
  },

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
    marginTop: 2,
  },

  // IMPORTANT: position relative so absolute dropdown anchors to this block
  voteField: { position: "relative", width: "100%" },

  voteInput: {
    width: "100%",
    padding: "14px 54px 14px 14px",
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
    display: "grid",
    placeItems: "center",
    WebkitTapHighlightColor: "transparent",
  },

  // ✅ Full-width dropdown anchored to the voteField
  dropdown: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(100% + 10px)",
    borderRadius: 16,
    background: "rgba(8,20,44,0.96)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 18px 55px rgba(0,0,0,0.42)",
    maxHeight: 320,
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
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  dropdownMain: { fontWeight: 900, fontSize: 16, lineHeight: 1.25 },
  dropdownSub: { fontSize: 13, opacity: 0.7, marginTop: 2 },

  dropdownEmpty: {
    padding: 14,
    fontSize: 14,
    opacity: 0.8,
  },

  button: {
    marginTop: 16,
    width: "100%",
    padding: "14px",
    borderRadius: 18,
    border: "1px solid rgba(255,122,26,0.35)",
    background: "rgba(255,122,26,0.22)",
    color: "#FFE2C9",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 18,
  },

  success: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: "rgba(120,255,173,0.10)",
    border: "1px solid rgba(120,255,173,0.22)",
    fontWeight: 800,
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