import { NextResponse } from "next/server";
import { newId } from "@/lib/crypto-util";
import { loadStore, mutateStore } from "@/lib/store";
import { publicPoll } from "@/lib/display";
import type { Poll } from "@/lib/types";
import { assertTeacher } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await loadStore();
  const polls = [...store.polls]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(({ voterFingerprints: _, ...p }) => p);
  return NextResponse.json(
    { polls },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

/** Teacher creates a lightweight anonymous poll (default Yes / Not yet). */
export async function POST(req: Request) {
  const unauthorized = assertTeacher(req);
  if (unauthorized) return unauthorized;

  try {
    const body = (await req.json()) as {
      prompt?: string;
      options?: { label: string }[];
    };

    const prompt = (body.prompt ?? "").trim();
    if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

    const labels =
      Array.isArray(body.options) && body.options.length >= 2
        ? body.options.map((o) => String(o.label).trim()).filter(Boolean).slice(0, 6)
        : ["Yes, clear", "Not yet"];

    const now = new Date().toISOString();
    const poll: Poll = {
      id: newId(),
      prompt,
      options: labels.map((label) => ({ id: newId(), label, count: 0 })),
      createdAt: now,
      voterFingerprints: [],
    };

    await mutateStore((draft) => {
      draft.polls.push(poll);
    });

    return NextResponse.json({ poll: publicPoll(poll) });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
