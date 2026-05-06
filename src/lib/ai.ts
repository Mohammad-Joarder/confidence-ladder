/**
 * Lightweight AI helpers: OpenAI when configured, otherwise deterministic fallbacks.
 */

export async function rewriteQuestion(title: string, body: string): Promise<{ improvedTitle: string; improvedBody: string }> {
  const key = process.env.OPENAI_API_KEY;
  const prompt = `Rewrite this student question to be clearer and more specific for a teacher. Keep the student's intent.\nTitle: ${title}\nBody: ${body}\nRespond as JSON only: {"title":"...","body":"..."}`;

  if (key) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          messages: [
            { role: "system", content: "You help shy students phrase questions clearly. Output strict JSON only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(content.replace(/^```json\s*|```$/g, "").trim()) as {
        title: string;
        body: string;
      };
      return { improvedTitle: parsed.title.trim(), improvedBody: parsed.body.trim() };
    } catch {
      // fall through
    }
  }

  const improvedTitle = title.trim() || "Need help with class material";
  const improvedBody =
    body.trim().length < 24
      ? `${body.trim()}\n\nCould you share which topic or example this relates to, and where you got stuck?`
      : body.trim();

  return { improvedTitle, improvedBody };
}
