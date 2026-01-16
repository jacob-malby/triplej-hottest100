import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Hash: field = person name, value = JSON votes array
const KEY = "votes:v1";

function norm(s: string) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export async function upsertPersonVotes(name: string, votes: string[]) {
  const cleanName = (name || "").trim();
  const cleanVotes = Array.from(new Set((votes || []).map(norm)))
    .filter(Boolean)
    .slice(0, 10);

  await redis.hset(KEY, { [cleanName]: JSON.stringify(cleanVotes) });

  return {
    name: cleanName,
    votes: cleanVotes,
    createdAt: new Date().toISOString(),
  };
}

export async function getVotersForSong(songTitle: string): Promise<string[]> {
  const target = norm(songTitle);
  if (!target) return [];

  const all = (await redis.hgetall<Record<string, string>>(KEY)) || {};
  const voters: string[] = [];

  for (const [personName, raw] of Object.entries(all)) {
    try {
      const votes = JSON.parse(raw) as string[];
      if (Array.isArray(votes) && votes.includes(target)) voters.push(personName);
    } catch {
      // ignore bad rows
    }
  }

  return voters;
}