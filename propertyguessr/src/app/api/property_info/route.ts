// src/app/api/property_info/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Return a random listing from the MongoDB `listing` collection in the
 * `zillow-webscraper` database. The cron job that runs elsewhere is expected
 * to write complete JSON documents into that collection.
 */
export async function GET(request: Request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);

    // Allow the client to request a specific logical listing pool via the
    // `listings` query param. We map `listings=canada` to the
    // `listings-canada` collection; any other value (or absence) uses
    // the default `listings` collection.
    const listingsParam = url.searchParams.get("listings") ?? "";
    const collectionName =
      listingsParam === "canada" ? "listings-canada" : "listings";
    const coll = db.collection(collectionName);

    // Parse count (number of unique listings requested). Default 1.
    const rawCount = url.searchParams.get("count") ?? "1";
    const count = Math.max(1, Math.min(50, Number.parseInt(rawCount, 10) || 1));

    // Only sample from the DB. The frontend is responsible for excluding
    // previously-used listing ids for a game session.
    const totalCount = await coll.countDocuments({});
    if (totalCount === 0) {
      return NextResponse.json({ error: "No listings found" }, { status: 404 });
    }

    const sampleSize = Math.min(count, totalCount);

    // Parse optional toExclude list. Frontend can send previously-used listing
    // ids for the current game via `toExclude`. Backend will sample and, for
    // single-item requests, attempt to resample until a listing not in that
    // list is produced (bounded attempts).
    const toExcludeParams = url.searchParams.getAll("toExclude");
    const toExcludeList: string[] = [];
    for (const e of toExcludeParams) {
      if (!e) continue;
      if (e.includes(",")) {
        toExcludeList.push(
          ...e
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        );
      } else {
        toExcludeList.push(e.trim());
      }
    }
    const toExcludeSet = new Set(toExcludeList.filter(Boolean));

    let docs: unknown[] = [];
    let usedFallback = false;
    // If client requested a single listing and provided toExclude ids, try
    // resampling until we find a unique one (or until attempts exhausted).
    if (sampleSize === 1 && toExcludeSet.size > 0) {
      const maxAttempts = 12;
      let attempt = 0;
      while (attempt < maxAttempts) {
        const out = await coll.aggregate([{ $sample: { size: 1 } }]).toArray();
        if (!out || out.length === 0) break;
        const cand = out[0] as Record<string, unknown>;
        let candId: string | undefined;
        if (cand._id !== undefined && cand._id !== null) {
          try {
            const maybe = cand._id as { toString?: () => string };
            candId = maybe.toString ? maybe.toString() : String(maybe);
          } catch {
            candId = String(cand._id);
          }
        } else {
          candId = undefined;
        }
        if (!candId || !toExcludeSet.has(candId)) {
          docs = out;
          break;
        }
        attempt++;
      }
      if (docs.length === 0) {
        // last resort: return one sampled doc but mark fallback so client knows
        docs = await coll.aggregate([{ $sample: { size: 1 } }]).toArray();
        usedFallback = true;
      }
    } else {
      const pipeline: Array<Record<string, unknown>> = [
        { $sample: { size: sampleSize } },
      ];
      docs = await coll.aggregate(pipeline).toArray();
    }

    // Normalize docs: convert _id to id (string) and remove _id
    const toIdString = (val: unknown) => {
      try {
        const maybe = val as { toString?: () => string };
        return maybe.toString ? maybe.toString() : String(val);
      } catch {
        return String(val);
      }
    };

    const normalized = docs.map((d) => {
      const docObj = { ...(d as Record<string, unknown>) } as Record<
        string,
        unknown
      >;
      if (docObj._id !== undefined) {
        docObj.id = toIdString(docObj._id);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - dynamic removal of property
        delete docObj._id;
      }
      return docObj;
    });

    // Backwards compatibility: if client requested a single listing, return an object
    if (count === 1) {
      const single = normalized[0] as Record<string, unknown>;
      if (usedFallback) {
        single.warning = "fallback_no_unique_after_attempts";
      }
      return NextResponse.json(single, { status: 200 });
    }

    return NextResponse.json(
      {
        requested: count,
        available: totalCount,
        returned: normalized.length,
        listings: normalized,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching listing(s) from DB:", err);
    return NextResponse.json(
      { error: "Failed to fetch listing(s) from database" },
      { status: 500 }
    );
  }
}
