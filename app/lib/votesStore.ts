import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const VOTES_KEY = "votes:v1";

function normSongKey(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function getVotersForSong(songTitle: string): Promise<string[]> {
  const songKey = normSongKey(songTitle);
  if (!songKey) return [];

  // hash: voterName -> JSON string array of normalized song keys
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