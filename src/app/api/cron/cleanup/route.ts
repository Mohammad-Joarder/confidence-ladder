import { NextResponse } from "next/server";
import { RETENTION_MS, pruneOlderThan } from "@/lib/retention";
import { loadStore, saveStore } from "@/lib/store";
import type { AppData } from "@/lib/types";

function verifyCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const before = await loadStore();
  const cutoff = Date.now() - RETENTION_MS;

  const questions = pruneOlderThan(before.questions, RETENTION_MS);
  const keptIds = new Set(questions.map((q) => q.id));

  const data: AppData = {
    questions,
    answers: before.answers.filter((a) => keptIds.has(a.questionId) && Date.parse(a.createdAt) >= cutoff),
    sessions: pruneOlderThan(before.sessions, RETENTION_MS),
    polls: pruneOlderThan(before.polls, RETENTION_MS),
    participation: Object.fromEntries(
      Object.entries(before.participation).filter(([, v]) => Date.parse(v.updatedAt) >= cutoff),
    ),
  };

  await saveStore(data);

  return NextResponse.json({
    ok: true,
    removed: {
      questions: before.questions.length - data.questions.length,
      answers: before.answers.length - data.answers.length,
      sessions: before.sessions.length - data.sessions.length,
      polls: before.polls.length - data.polls.length,
      participation: Object.keys(before.participation).length - Object.keys(data.participation).length,
    },
  });
}
