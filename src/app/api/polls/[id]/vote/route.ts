import { NextResponse } from "next/server";
import { publicPoll } from "@/lib/display";
import { fingerprint, participationKey } from "@/lib/crypto-util";
import { bumpParticipation } from "@/lib/participation";
import { mutateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_VOTERS = 8000;

type VoteOutcome = "ok" | "not_found" | "duplicate" | "invalid_option" | "poll_full";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = typeof rawId === "string" ? decodeURIComponent(rawId.trim()) : "";

  try {
    const body = (await req.json()) as { optionId?: string; clientToken?: string };
    const optionId = typeof body.optionId === "string" ? body.optionId.trim() : "";
    const rawToken = typeof body.clientToken === "string" ? body.clientToken.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "Poll id required" }, { status: 400 });
    }
    if (!optionId) {
      return NextResponse.json({ error: "optionId required" }, { status: 400 });
    }

    const needle = id.toLowerCase();
    let outcome: VoteOutcome = "not_found";

    const updated = await mutateStore((draft) => {
      const poll = draft.polls.find((p) => p.id.toLowerCase() === needle);
      if (!poll) {
        outcome = "not_found";
        return;
      }
      const canonicalId = poll.id;
      const voterFp = fingerprint(`${rawToken || "anon"}:poll:${canonicalId}`);
      if (poll.voterFingerprints.includes(voterFp)) {
        outcome = "duplicate";
        return;
      }
      if (poll.voterFingerprints.length >= MAX_VOTERS) {
        outcome = "poll_full";
        return;
      }
      const opt = poll.options.find((o) => o.id === optionId);
      if (!opt) {
        outcome = "invalid_option";
        return;
      }
      opt.count += 1;
      poll.voterFingerprints.push(voterFp);
      bumpParticipation(draft, participationKey(rawToken || "anon"), { kind: "poll_vote" });
      outcome = "ok";
    });

    const poll = updated.polls.find((p) => p.id.toLowerCase() === needle);
    if (!poll || outcome === "not_found") {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const payload = publicPoll(poll);

    if (outcome === "duplicate") {
      return NextResponse.json({ poll: payload, duplicate: true });
    }
    if (outcome === "invalid_option") {
      return NextResponse.json({ error: "Invalid option", poll: payload }, { status: 400 });
    }
    if (outcome === "poll_full") {
      return NextResponse.json(
        { error: "Poll has reached the vote limit", poll: payload },
        { status: 429 },
      );
    }

    return NextResponse.json({ poll: payload });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
