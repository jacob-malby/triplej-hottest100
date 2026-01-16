import { upsertPersonVotes } from "@/app/lib/votesStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = (body?.name ?? "").toString();
    const votes = Array.isArray(body?.votes) ? body.votes.map(String) : [];

    if (!name.trim()) {
      return Response.json({ ok: false, error: "Name is required" }, { status: 400 });
    }

    const saved = await upsertPersonVotes(name, votes);
    return Response.json({ ok: true, saved });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
