import { NextResponse } from "next/server";
import { newId } from "@/lib/crypto-util";
import { loadStore, mutateStore } from "@/lib/store";
import type { DoubtSession } from "@/lib/types";
import { assertTeacher } from "@/lib/teacher-auth";

export async function GET() {
  const store = await loadStore();
  const sessions = [...store.sessions].sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  const unauthorized = assertTeacher(req);
  if (unauthorized) return unauthorized;

  try {
    const body = (await req.json()) as { topic?: string; startsAt?: string; meetingUrl?: string };
    const topic = (body.topic ?? "").trim();
    const startsAt = (body.startsAt ?? "").trim();
    if (!topic || !startsAt) {
      return NextResponse.json({ error: "topic and startsAt (ISO) required." }, { status: 400 });
    }
    if (Number.isNaN(Date.parse(startsAt))) {
      return NextResponse.json({ error: "startsAt must be a valid ISO date." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const session: DoubtSession = {
      id: newId(),
      topic,
      startsAt,
      meetingUrl: body.meetingUrl?.trim() || undefined,
      createdAt: now,
    };

    await mutateStore((draft) => {
      draft.sessions.push(session);
    });

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
