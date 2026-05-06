import { NextResponse } from "next/server";
import { fingerprint, participationKey } from "@/lib/crypto-util";
import { bumpParticipation } from "@/lib/participation";
import { mutateStore } from "@/lib/store";

const MAX_FP = 4000;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as { clientToken?: string };
    const rawToken = typeof body.clientToken === "string" ? body.clientToken : "anon";
    const fp = fingerprint(`${rawToken}:upvote:${id}`);

    await mutateStore((draft) => {
      const q = draft.questions.find((x) => x.id === id);
      if (!q) return;
      if (q.upvoteFingerprints.includes(fp)) return;
      if (q.upvoteFingerprints.length >= MAX_FP) return;
      q.upvoteFingerprints.push(fp);
      q.upvotes += 1;
      q.updatedAt = new Date().toISOString();
      bumpParticipation(draft, participationKey(rawToken), { kind: "upvote" });
    });

    const { loadStore } = await import("@/lib/store");
    const store = await loadStore();
    const q = store.questions.find((x) => x.id === id);
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ upvotes: q.upvotes });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
