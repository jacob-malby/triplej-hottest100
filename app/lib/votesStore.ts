import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const VOTES_KEY = "votes:v1";

// Use ONE normalizer everywhere (save + read)
export function normSongKey(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Save / update a person's votes.
 * Stores: HASH votes:v1  field=<name>  value=<JSON string array of normalized song keys>
 */
export async function upsertPersonVotes(name: string, votes: string[]) {
  const cleanName = (name || "").trim();
  if (!cleanName) throw new Error("Name is required");

  const cleanVotes = Array.from(new Set(votes.map(normSongKey)))
    .filter(Boolean)
    .slice(0, 10);

  // Store as JSON string (stable across clients)
  await redis.hset(VOTES_KEY, {
    [cleanName]: JSON.stringify(cleanVotes),
  });

  return {
    name: cleanName,
    votes: cleanVotes,
    createdAt: new Date().toISOString(),
  };
}

function coerceVoteArray(raw: unknown): string[] | null {
  // Case 1: already an array (some clients / wrappers can yield this)
  if (Array.isArray(raw)) {
    return raw.map(String);
  }

  // Case 2: string -> JSON
  if (typeof raw === "string") {
    // raw might be a JSON array string
    try {
      const parsed = JSON.parse(raw);

      // parsed is array
      if (Array.isArray(parsed)) return parsed.map(String);

      // parsed is a string (double-encoded JSON)
      if (typeof parsed === "string") {
        try {
          const parsed2 = JSON.parse(parsed);
          if (Array.isArray(parsed2)) return parsed2.map(String);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    // Fall back: if someone stored a comma-separated string
    // (not expected, but helps diagnostics)
    if (raw.includes(",")) {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(String);
    }

    return null;
  }

  return null;
}

/**
 * Find all voters who voted for a given song.
 * Reads all fields in votes:v1 and checks whose list contains the normalized song key.
 */
export async function getVotersForSong(songTitle: string): Promise<string[]> {
  const songKey = normSongKey(songTitle);
  if (!songKey) return [];

  // IMPORTANT: don't force Record<string,string> – allow unknown so we can handle real runtime shapes
  const all = await redis.hgetall<Record<string, unknown>>(VOTES_KEY);
  if (!all) return [];

  const voters: string[] = [];

  for (const [voterName, raw] of Object.entries(all)) {
    if (raw == null) continue;

    const arr = coerceVoteArray(raw);
    if (!arr) continue;

    if (arr.includes(songKey)) voters.push(voterName);
  }

  voters.sort((a, b) => a.localeCompare(b));
  return voters;
}