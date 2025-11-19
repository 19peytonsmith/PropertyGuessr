import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

type ScoreDoc = {
  score: number;
  ts: number;
  durationMs?: number | null;
  clientId?: string | null;
  isCanada?: boolean;
};

export async function GET() {
  try {
    const db = await getDb();
    const coll = db.collection("scores");
    // fetch up to 200 docs
    const docs = await coll.find<ScoreDoc>({}).limit(200).toArray();

    // sort for leaderboard view: by score desc, tiebreaker = shortest duration
    docs.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aDur = typeof a.durationMs === "number" ? a.durationMs : Infinity;
      const bDur = typeof b.durationMs === "number" ? b.durationMs : Infinity;
      return aDur - bDur;
    });

    const out = docs.map((d) => ({
      score: d.score,
      ts: d.ts,
      durationMs: d.durationMs ?? null,
      clientId: d.clientId ?? null,
      isCanada: !!d.isCanada,
    }));

    return NextResponse.json(out);
  } catch (err) {
    console.error("GET /api/scores error", err);
    return NextResponse.json({ error: "failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const score = typeof body.score === "number" ? body.score : null;
    const ts = typeof body.ts === "number" ? body.ts : Date.now();
    const durationMs =
      typeof body.durationMs === "number" ? body.durationMs : null;
    const clientId =
      body && typeof body.clientId === "string" ? body.clientId : null;
    const isCanada = body && body.isCanada === true;

    if (score == null) {
      return NextResponse.json({ error: "score required" }, { status: 400 });
    }

    const db = await getDb();
    const coll = db.collection("scores");
    if (clientId) {
      // if a record exists for this clientId, update only when the new score is better
      const existing = await coll.findOne<ScoreDoc>({ clientId });
      if (!existing) {
        const insertRes = await coll.insertOne({
          clientId,
          score,
          ts,
          durationMs,
          isCanada,
        });
        return NextResponse.json({
          insertedId: insertRes.insertedId,
          ok: true,
        });
      }

      const shouldUpdate = (() => {
        if (score > existing.score) return true;
        if (score < existing.score) return false;
        // equal scores: prefer shorter duration (if available)
        const existingDur =
          typeof existing.durationMs === "number"
            ? existing.durationMs
            : Number.POSITIVE_INFINITY;
        const incomingDur =
          typeof durationMs === "number"
            ? durationMs
            : Number.POSITIVE_INFINITY;
        return incomingDur < existingDur;
      })();

      if (shouldUpdate) {
        await coll.updateOne(
          { clientId },
          { $set: { score, ts, durationMs, isCanada } }
        );
        return NextResponse.json({ updated: true, ok: true });
      }

      // nothing to do
      return NextResponse.json({ updated: false, ok: true });
    }

    // fallback: no clientId provided — insert as anonymous
    const insertRes = await coll.insertOne({
      score,
      ts,
      durationMs,
      isCanada,
    });
    return NextResponse.json({ insertedId: insertRes.insertedId, ok: true });
  } catch (err) {
    console.error("POST /api/scores error", err);
    return NextResponse.json({ error: "failed to write" }, { status: 500 });
  }
}
