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

  await redis.hset(VOTES_KEY, {
    [cleanName]: JSON.stringify(cleanVotes),
  });

  return {
    name: cleanName,
    votes: cleanVotes,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Find all voters who voted for a given song.
 * Reads all fields in votes:v1 and checks whose list contains the normalized song key.
 */
export async function getVotersForSong(songTitle: string): Promise<string[]> {
  const songKey = normSongKey(songTitle);
  if (!songKey) return [];

  const all = await redis.hgetall<Record<string, string>>(VOTES_KEY);
  if (!all) return [];

  const voters: string[] = [];

  for (const [voterName, raw] of Object.entries(all)) {
    if (!raw) continue;

    let arr: unknown;
    try {
      arr = JSON.parse(raw);
    } catch {
      continue;
    }

    if (Array.isArray(arr) && arr.includes(songKey)) {
      voters.push(voterName);
    }
  }

  voters.sort((a, b) => a.localeCompare(b));
  return voters;
}