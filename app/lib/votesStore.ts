import { promises as fs } from "fs";
import path from "path";

export type VotesDb = {
  people: Array<{
    name: string;
    votes: string[]; // normalized song titles
    createdAt: string;
  }>;
};

const DB_PATH = path.join(process.cwd(), "votes-db.json");

async function readDb(): Promise<VotesDb> {
  try {
    const txt = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(txt) as VotesDb;
    if (!parsed.people) return { people: [] };
    return parsed;
  } catch {
    return { people: [] };
  }
}

async function writeDb(db: VotesDb) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\b(feat|ft|featuring|live|version|edit|remix)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export async function upsertPersonVotes(name: string, votes: string[]) {
  const db = await readDb();
  const cleanName = (name || "").trim();
  const cleanVotes = Array.from(new Set(votes.map(norm))).filter(Boolean).slice(0, 10);

  const idx = db.people.findIndex((p) => norm(p.name) === norm(cleanName));
  const entry = {
    name: cleanName,
    votes: cleanVotes,
    createdAt: new Date().toISOString(),
  };

  if (idx >= 0) db.people[idx] = entry;
  else db.people.push(entry);

  await writeDb(db);
  return entry;
}

export async function getVotersForSong(songTitle: string) {
  const db = await readDb();
  const target = norm(songTitle);
  return db.people
    .filter((p) => p.votes.includes(target))
    .map((p) => p.name);
}
