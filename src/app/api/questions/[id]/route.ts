import { NextResponse } from "next/server";
import { publicQuestion } from "@/lib/display";
import { similarityScore, similarQuestionCount } from "@/lib/similarity";
import { loadStore, mutateStore } from "@/lib/store";
import { assertTeacher } from "@/lib/teacher-auth";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = await loadStore();
  const q = store.questions.find((x) => x.id === id);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const answers = store.answers
    .filter((a) => a.questionId === id)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const similar = store.questions
    .filter((other) => other.id !== id)
    .map((other) => ({
      question: publicQuestion(other),
      score: similarityScore(`${q.title}\n${q.body}`, `${other.title}\n${other.body}`),
    }))
    .filter((x) => x.score >= 0.22)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.question);

  return NextResponse.json({
    question: {
      ...publicQuestion(q),
      similarCount: similarQuestionCount(q, store.questions),
    },
    answers,
    suggestedSimilar: similar,
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = assertTeacher(req);
  if (unauthorized) return unauthorized;

  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as { markedLiveClarification?: boolean };
    await mutateStore((draft) => {
      const q = draft.questions.find((x) => x.id === id);
      if (!q) return;
      if (typeof body.markedLiveClarification === "boolean") {
        q.markedLiveClarification = body.markedLiveClarification;
        q.updatedAt = new Date().toISOString();
      }
    });
    const store = await loadStore();
    const q = store.questions.find((x) => x.id === id);
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ question: publicQuestion(q) });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
