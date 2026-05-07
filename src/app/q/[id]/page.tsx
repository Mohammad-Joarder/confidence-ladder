import Link from "next/link";
import { notFound } from "next/navigation";
import { RichHtml } from "@/components/RichHtml";
import { StatusLegend } from "@/components/StatusLegend";
import { publicQuestion } from "@/lib/display";
import { isRichTextEmpty } from "@/lib/html-plain";
import { similarityScore } from "@/lib/similarity";
import { loadStore } from "@/lib/store";
import { QuestionActions } from "./question-actions";

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await loadStore();
  const raw = store.questions.find((q) => q.id === id);
  if (!raw) notFound();

  const q = publicQuestion(raw);
  const answers = store.answers
    .filter((a) => a.questionId === id)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const suggestedSimilar = store.questions
    .filter((other) => other.id !== id)
    .map((other) => ({
      other,
      score: similarityScore(`${raw.title}\n${raw.body}`, `${other.title}\n${other.body}`),
    }))
    .filter((x) => x.score >= 0.22)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => publicQuestion(x.other));

  return (
    <div className="space-y-6">
      <StatusLegend compact />

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={
              q.status === "answered"
                ? "rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100"
            }
          >
            {q.status === "answered" ? "Answered" : "Pending"}
          </span>
          {raw.anonymous ? (
            <span className="text-slate-500">Anonymous</span>
          ) : (
            <span className="text-slate-600">{raw.authorDisplay}</span>
          )}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Question ID: {q.id}
          </span>
          <span className="text-slate-400">↑ {q.upvotes}</span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{q.title}</h1>
        <div className="mt-3 text-slate-700 dark:text-slate-300">
          {isRichTextEmpty(q.body) ? (
            <p className="text-slate-500 italic">No details.</p>
          ) : (
            <RichHtml html={q.body} />
          )}
        </div>
        {q.aiImprovedBody && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
            <p className="font-medium text-slate-800 dark:text-slate-100">AI clarity suggestion</p>
            <div className="mt-1 text-slate-700 dark:text-slate-300">
              <RichHtml html={q.aiImprovedBody} />
            </div>
          </div>
        )}
        {q.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {q.tags.map((t) => (
              <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                {t}
              </span>
            ))}
          </div>
        )}

        <QuestionActions questionId={q.id} />
      </article>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Answers</h2>
        {answers.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No official answer yet.</p>
        ) : (
          <ul className="space-y-3">
            {answers.map((a) => (
              <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-slate-800 dark:text-slate-100">
                  <RichHtml html={a.body} />
                </div>
                <p className="mt-2 text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {suggestedSimilar.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Similar on the board</h2>
          <ul className="mt-2 space-y-2">
            {suggestedSimilar.map((sq) => (
              <li key={sq.id}>
                <Link href={`/q/${sq.id}`} className="text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-400">
                  {sq.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/" className="text-sm text-slate-600 underline dark:text-slate-400">
        ← Back to board
      </Link>
    </div>
  );
}



