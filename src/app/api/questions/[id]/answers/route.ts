import { NextResponse } from "next/server";
import { newId } from "@/lib/crypto-util";
import { mutateStore } from "@/lib/store";
import type { Answer } from "@/lib/types";
import { assertTeacher } from "@/lib/teacher-auth";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = assertTeacher(req);
  if (unauthorized) return unauthorized;

  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as { body?: string };
    const text = (body.body ?? "").trim();
    if (!text) return NextResponse.json({ error: "Answer text required." }, { status: 400 });

    const now = new Date().toISOString();
    const answer: Answer = {
      id: newId(),
      questionId: id,
      body: text,
      createdAt: now,
    };

    await mutateStore((draft) => {
      const q = draft.questions.find((x) => x.id === id);
      if (!q) return;
      draft.answers.push(answer);
      q.status = "answered";
      q.updatedAt = now;
    });

    const { loadStore } = await import("@/lib/store");
    const store = await loadStore();
    const q = store.questions.find((x) => x.id === id);
    if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    return NextResponse.json({ answer, questionStatus: q.status });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
