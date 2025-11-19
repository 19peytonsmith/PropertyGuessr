import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

type ScoreDoc = {
  score: number;
  ts: number;
  durationMs?: number | null;
  clientId?: string | null;
  _id?: ObjectId;
};

export async function GET(
  _request: Request,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    let objId: ObjectId;
    try {
      objId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const db = await getDb();
    const coll = db.collection<ScoreDoc>("scores");
    const doc = await coll.findOne({ _id: objId });
    if (!doc) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({
      score: doc.score,
      ts: doc.ts,
      durationMs: doc.durationMs ?? null,
      clientId: doc.clientId ?? null,
      _id: doc._id?.toString?.() ?? null,
    });
  } catch (err) {
    console.error("GET /api/scores/[id] error", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    let objId: ObjectId;
    try {
      objId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const db = await getDb();
    const coll = db.collection("scores");
    const res = await coll.deleteOne({ _id: objId });
    return NextResponse.json({ deletedCount: res.deletedCount });
  } catch (err) {
    console.error("DELETE /api/scores/[id] error", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
