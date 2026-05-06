import { NextResponse } from "next/server";
import { participationKey } from "@/lib/crypto-util";
import { loadStore, mutateStore } from "@/lib/store";

const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Passive reader heuristic: several visits but no questions asked. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("clientToken") ?? "";
  if (token.length < 8) return NextResponse.json({ nudge: false });

  const store = await loadStore();
  const key = participationKey(token);
  const rec = store.participation[key];

  if (!rec) return NextResponse.json({ nudge: false });

  const passive = rec.pageViews >= 3 && rec.questionsAsked === 0;
  if (!passive) return NextResponse.json({ nudge: false });

  const last = rec.lastNudgeAt ? Date.parse(rec.lastNudgeAt) : 0;
  if (last && Date.now() - last < NUDGE_COOLDOWN_MS) {
    return NextResponse.json({ nudge: false });
  }

  const message =
    "You’ve been browsing quietly — that’s okay. If anything feels fuzzy, try posting anonymously: one sentence is enough.";

  await mutateStore((draft) => {
    const r = draft.participation[key];
    if (r) r.lastNudgeAt = new Date().toISOString();
  });

  return NextResponse.json({
    nudge: true,
    message,
    suggestedAction: "/ask",
  });
}
