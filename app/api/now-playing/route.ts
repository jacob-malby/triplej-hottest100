import * as cheerio from "cheerio";
import { SONGS, type SongRow } from "@/app/data/songs";
import { getVotersForSong } from "@/app/lib/votesStore";

export const runtime = "nodejs";

const TRIPLEJ_URL = "https://www.abc.net.au/triplej/countdown/hottest100";

// Normalize for matching
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // remove symbols + spaces
    .trim();
}

/**
 * Extract now playing song from Triple J page
 */
function extractNowPlaying(html: string): { title: string | null; artist: string | null } {
  const $ = cheerio.load(html);

  const heroTitle =
    $('section[data-component="SongCountdownHero"] h3[id^="title-"]').first().text().trim() ||
    $('section[data-component="SongCountdownHero"] h3[class*="SongCountdownHero_title"]')
      .first()
      .text()
      .trim();

  if (heroTitle) {
    return { title: heroTitle, artist: null };
  }

  const byIdTitle = $('h3[id^="title-"]').first().text().trim();
  if (byIdTitle) {
    return { title: byIdTitle, artist: null };
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
      const parts = text.split(" - ");
      return {
        title: parts[0]?.trim() || text,
        artist: parts[1]?.trim() || null,
      };
    }
  }

  return { title: null, artist: null };
}

export async function GET(req: Request) {
  try {
    // -----------------------
    // TEST MODE
    // -----------------------

    const { searchParams } = new URL(req.url);
    const testSong = searchParams.get("test");

    let now: { title: string | null; artist: string | null };

    if (testSong) {
      console.log("TEST MODE ACTIVE:", testSong);
      now = {
        title: testSong,
        artist: "TEST ARTIST",
      };
    } else {
      // -----------------------
      // LIVE MODE
      // -----------------------

      const tripleRes = await fetch(TRIPLEJ_URL, {
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; H100-party-app/1.0)",
        },
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

    // -----------------------
    // SONG MATCHING
    // -----------------------

    let matched: SongRow | null = null;

    if (now.title) {
      const target = norm(now.title);

      matched =
        SONGS.find((r) => norm(r.songTitle) === target) ??
        SONGS.find((r) => target.includes(norm(r.songTitle))) ??
        SONGS.find((r) => norm(r.songTitle).includes(target)) ??
        null;
    }

    // -----------------------
    // VOTERS
    // -----------------------

    const voters = matched ? await getVotersForSong(matched.songTitle) : [];

    // -----------------------
    // RESPONSE
    // -----------------------

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
            chosenActivity:
              voters.length > 0 ? matched.voterActivity : matched.generalActivity,
          }
        : null,
    });
  } catch (e: any) {
    console.error(e);
    return Response.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}