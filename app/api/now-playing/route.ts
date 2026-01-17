import * as cheerio from "cheerio";
import { SONGS, type SongRow } from "@/app/data/songs";
import { getVotersForSong } from "@/app/lib/votesStore";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const TRIPLEJ_URL = "https://www.abc.net.au/triplej/countdown/hottest100";

// Local normalizer for matching song titles to SONGS list
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Split common "Title - Artist" variants (hyphen/en-dash/em-dash)
function splitTitleArtist(text: string): { title: string; artist: string | null } {
  const t = (text || "").trim();
  if (!t) return { title: "", artist: null };

  const seps = [" - ", " – ", " — "]; // hyphen, en dash, em dash (with spaces)
  for (const sep of seps) {
    if (t.includes(sep)) {
      const [a, b, ...rest] = t.split(sep);
      const title = (a || "").trim();
      const artist = [b, ...rest].join(sep).trim() || null;
      return { title: title || t, artist };
    }
  }
  return { title: t, artist: null };
}

/**
 * Extract now playing song from Triple J page
 */
function extractNowPlaying(html: string): {
  title: string | null;
  artist: string | null;
  debug: { source: string | null; raw: string | null };
} {
  const $ = cheerio.load(html);

  const heroTitle =
    $('section[data-component="SongCountdownHero"] h3[id^="title-"]').first().text().trim() ||
    $('section[data-component="SongCountdownHero"] h3[class*="SongCountdownHero_title"]')
      .first()
      .text()
      .trim();

  // ✅ FIX: heroTitle now also splits title/artist if present
  if (heroTitle) {
    const parsed = splitTitleArtist(heroTitle);
    return {
      title: parsed.title || null,
      artist: parsed.artist,
      debug: { source: "heroTitle", raw: heroTitle },
    };
  }

  const byIdTitle = $('h3[id^="title-"]').first().text().trim();
  if (byIdTitle) {
    const parsed = splitTitleArtist(byIdTitle);
    return {
      title: parsed.title || null,
      artist: parsed.artist,
      debug: { source: "byIdTitle", raw: byIdTitle },
    };
  }

  const candidateSelectors = [
    '[data-testid*="now"]',
    '[class*="now"]',
    '[aria-label*="Now"]',
    '[aria-label*="now"]',
    'main h3[class*="title"]',
    "main h2",
    "main h3",
  ];

  for (const sel of candidateSelectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length >= 3 && text.length <= 120) {
      const parsed = splitTitleArtist(text);
      return {
        title: parsed.title || text,
        artist: parsed.artist,
        debug: { source: `selector:${sel}`, raw: text },
      };
    }
  }

  return { title: null, artist: null, debug: { source: null, raw: null } };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const testSong = searchParams.get("test");

    let now: {
      title: string | null;
      artist: string | null;
      debug: { source: string | null; raw: string | null };
    };

    if (testSong) {
      now = { title: testSong, artist: "TEST ARTIST", debug: { source: "test", raw: testSong } };
    } else {
      const tripleRes = await fetch(TRIPLEJ_URL, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; H100-party-app/1.0)" },
      });

      if (!tripleRes.ok) {
        return Response.json(
          { ok: false, error: `Triple J fetch failed: ${tripleRes.status}` },
          { status: 502 }
        );
      }

      const html = await tripleRes.text();
      now = extractNowPlaying(html);
    }

    // SONG MATCHING
    let matched: SongRow | null = null;

    if (now.title) {
      const target = norm(now.title);

      matched =
        SONGS.find((r) => norm(r.songTitle) === target) ??
        SONGS.find((r) => target.includes(norm(r.songTitle))) ??
        SONGS.find((r) => norm(r.songTitle).includes(target)) ??
        null;
    }

    // VOTERS
    const voters = matched ? await getVotersForSong(matched.songTitle) : [];

    // 🔎 EXTRA DEBUG: sample what Redis actually returns for a couple of fields
    // (safe-ish for dev; remove before prod if you don't want names/values in responses)
    const redis = Redis.fromEnv();
    const VOTES_KEY = "votes:v1";
    const all = await redis.hgetall<Record<string, unknown>>(VOTES_KEY);

    const sample = all
      ? Object.entries(all)
          .slice(0, 5)
          .map(([name, value]) => ({
            name,
            typeof: Array.isArray(value) ? "array" : typeof value,
            preview:
              typeof value === "string"
                ? value.slice(0, 120)
                : Array.isArray(value)
                ? value.slice(0, 10)
                : value,
          }))
      : [];

    return Response.json({
      ok: true,
      triplej: {
        url: TRIPLEJ_URL,
        nowTitle: now.title,
        artist: now.artist,
      },
      match: matched
        ? {
            displayTop: `${matched.songTitle} - ${matched.artist}`,
            generalActivity: matched.generalActivity,
            voterActivity: matched.voterActivity,
            voters,
            chosenActivity: voters.length > 0 ? matched.voterActivity : matched.generalActivity,
          }
        : null,
      debug: {
        extract: now.debug,
        detectedNormalized: now.title ? norm(now.title) : null,
        matchedNormalized: matched ? norm(matched.songTitle) : null,
        votersCount: voters.length,
        redisSample: sample,
      },
    });
  } catch (e: any) {
    console.error(e);
    return Response.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}