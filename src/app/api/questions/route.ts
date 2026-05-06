import { NextResponse } from "next/server";
import { newId, participationKey } from "@/lib/crypto-util";
import { bumpParticipation } from "@/lib/participation";
import { similarQuestionCount } from "@/lib/similarity";
import { mutateStore, loadStore } from "@/lib/store";
import type { Question } from "@/lib/types";
import { publicQuestion } from "@/lib/display";

export async function GET() {
  const store = await loadStore();
  const list = store.questions.map((q) => ({
    ...publicQuestion(q),
    similarCount: similarQuestionCount(q, store.questions),
  }));
  list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return NextResponse.json({ questions: list });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: string;
      body?: string;
      anonymous?: boolean;
      authorDisplay?: string;
      tags?: string[];
      useAiImprovement?: boolean;
      clientToken?: string;
    };

    const title = (body.title ?? "").trim();
    const text = (body.body ?? "").trim();
    if (!title || !text) {
      return NextResponse.json({ error: "Title and question text are required." }, { status: 400 });
    }

    const anonymous = Boolean(body.anonymous);
    const authorDisplay = anonymous ? undefined : (body.authorDisplay ?? "").trim() || "Student";

    const tags = Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
      : [];

    const now = new Date().toISOString();
    let aiImprovedBody: string | undefined;

    if (body.useAiImprovement) {
      const { rewriteQuestion } = await import("@/lib/ai");
      const improved = await rewriteQuestion(title, text);
      aiImprovedBody = improved.improvedBody;
    }

    const q: Question = {
      id: newId(),
      title,
      body: text,
      anonymous,
      authorDisplay,
      tags,
      createdAt: now,
      updatedAt: now,
      upvotes: 0,
      upvoteFingerprints: [],
      status: "pending",
      markedLiveClarification: false,
      aiImprovedBody,
    };

    const clientToken = typeof body.clientToken === "string" ? body.clientToken : undefined;

    await mutateStore((draft) => {
      draft.questions.push(q);
      if (clientToken) {
        bumpParticipation(draft, participationKey(clientToken), {
          kind: "question_asked",
          anonymous,
        });
      }
    });

    return NextResponse.json({ question: publicQuestion(q) });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
}
