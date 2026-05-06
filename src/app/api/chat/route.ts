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

    const key = process.env.OPENAI_API_KEY;
    if (key && ranked.length > 0) {
      try {
        const ctx = ranked
          .slice(0, 4)
          .map(({ q }) => `- ${q.title}: ${q.body.slice(0, 160)}`)
          .join("\n");
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You help shy students. Be brief and warm. Suggest they ask on the board if unsure. Use only the provided board excerpts.",
              },
              {
                role: "user",
                content: `Student message:\n${msg}\n\nBoard excerpts:\n${ctx}\n\nReply in under 120 words.`,
              },
            ],
            temperature: 0.5,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) reply = text;
        }
      } catch {
        // keep heuristic reply
      }
    }

    return NextResponse.json({
      reply,
      links: ranked.slice(0, 5).map(({ q }) => ({ id: q.id, title: q.title })),
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
