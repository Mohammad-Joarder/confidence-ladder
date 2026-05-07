import { NextResponse } from "next/server";
import { similarityScore } from "@/lib/similarity";
import { loadStore } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: string };
    const msg = (body.message ?? "").trim();
    if (!msg) return NextResponse.json({ error: "message required" }, { status: 400 });

    const store = await loadStore();

    const ranked = store.questions
      .map((q) => ({
        q,
        score: similarityScore(msg, `${q.title}\n${q.body}`),
      }))
      .filter((x) => x.score > 0.12)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const answered = ranked.filter((x) => x.q.status === "answered");
    const snippets: string[] = [];
    for (const { q } of answered.slice(0, 2)) {
      const ans = store.answers.find((a) => a.questionId === q.id);
      if (ans) snippets.push(`Related Q: "${q.title}" → ${ans.body.slice(0, 220)}${ans.body.length > 220 ? "…" : ""}`);
    }

    let reply =
      ranked.length === 0
        ? "I didn’t find a close match on the board yet. Try asking anonymously — even a rough note helps teachers know where to clarify."
        : `Here are topics close to what you said. Opening one may answer faster than waiting:`;

    if (snippets.length) {
      reply += `\n\nFrom past answers:\n- ${snippets.join("\n- ")}`;
    }

    return NextResponse.json({
      reply,
      links: ranked.slice(0, 5).map(({ q }) => ({ id: q.id, title: q.title })),
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
