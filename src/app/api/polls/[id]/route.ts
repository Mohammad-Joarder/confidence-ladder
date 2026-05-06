import { NextResponse } from "next/server";
import { publicPoll } from "@/lib/display";
import { loadStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Fetch one poll by id (public, no fingerprints). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: raw } = await ctx.params;
  const id = typeof raw === "string" ? decodeURIComponent(raw.trim()) : "";
  if (!id) return NextResponse.json({ error: "Poll id required" }, { status: 400 });

  const store = await loadStore();
  const needle = id.toLowerCase();
  const poll = store.polls.find((p) => p.id.toLowerCase() === needle);
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  return NextResponse.json(
    { poll: publicPoll(poll) },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
