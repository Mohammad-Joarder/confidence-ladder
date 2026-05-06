import Link from "next/link";
import { StatusLegend } from "@/components/StatusLegend";
import { publicQuestion } from "@/lib/display";
import { similarQuestionCount } from "@/lib/similarity";
import { loadStore } from "@/lib/store";

export default async function BoardPage() {
  let store;
  try {
    store = await loadStore();
  } catch {
    return (
      <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
        <h1 className="text-2xl font-semibold text-red-900 dark:text-red-200">
          Can&apos;t load the board
        </h1>
        <p className="text-sm text-red-800 dark:text-red-300">
          Data is read from a JSON file on the server (<code className="rounded bg-red-100 px-1 dark:bg-red-900">data/store.json</code>{" "}
          by default, or <code className="rounded bg-red-100 px-1 dark:bg-red-900">STORE_JSON_PATH</code>). If this is
          serverless hosting without a writable disk, run the app on a VPS / Docker / Node host with a persistent volume,
          or point <code className="rounded bg-red-100 px-1 dark:bg-red-900">STORE_JSON_PATH</code> at a writable path (e.g.{" "}
          <code className="rounded bg-red-100 px-1 dark:bg-red-900">/tmp/store.json</code> — data may reset when the instance
          restarts).
        </p>
      </div>
    );
  }
  const rows = store.questions
    .map((raw) => ({
      raw,
      q: publicQuestion(raw),
      similarCount: similarQuestionCount(raw, store.questions),
    }))
    .sort((a, b) => Date.parse(b.q.createdAt) - Date.parse(a.q.createdAt));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Question board
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Ask anonymously or by name. Teachers can answer directly or mark a question for a live
          clarification session.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
            Total questions: {rows.length}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
            Answered: {rows.filter((x) => x.q.status === "answered").length}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
            Pending: {rows.filter((x) => x.q.status !== "answered").length}
          </span>
        </div>
      </section>

      <StatusLegend />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">All questions</h2>
        <Link
          href="/ask"
          className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Ask a question
        </Link>
      </div>

      <ul className="space-y-3">
        {rows.length === 0 && (
          <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            No questions yet — be the first.
          </li>
        )}
        {rows.map(({ raw, q, similarCount }) => (
          <li key={q.id}>
            <Link
              href={`/q/${q.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={
                    q.status === "answered"
                      ? "rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                      : "rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                  }
                >
                  {q.status === "answered" ? "Answered" : "Pending"}
                </span>
                {q.markedLiveClarification && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                    Live session
                  </span>
                )}
                {raw.anonymous ? (
                  <span className="text-slate-500">Anonymous</span>
                ) : (
                  <span className="text-slate-600 dark:text-slate-300">{raw.authorDisplay ?? "Named"}</span>
                )}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  ID: {q.id.slice(0, 8)}
                </span>
                <span className="text-slate-400">· ↑ {q.upvotes}</span>
                {similarCount > 0 && <span className="text-slate-400">· {similarCount} similar</span>}
              </div>
              <h2 className="mt-2 font-medium text-slate-900 dark:text-white">{q.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{q.body}</p>
              {q.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {q.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}



