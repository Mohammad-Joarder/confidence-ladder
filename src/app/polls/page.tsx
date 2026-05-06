import Link from "next/link";
import { publicPoll } from "@/lib/display";
import { loadStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PollsHubPage() {
  let polls: ReturnType<typeof publicPoll>[] = [];
  let loadError = false;

  try {
    const store = await loadStore();
    polls = [...store.polls]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((p) => publicPoll(p));
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Polls</h1>
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Data could not be loaded (network or storage issue). Nothing was deleted — try again shortly,
          or check server logs / Blob configuration if you deploy remotely.
        </p>
        <Link href="/" className="text-sm text-slate-600 underline dark:text-slate-400">
          ← Back to board
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Polls</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Anonymous checks created by your teacher. Open a poll to vote — each device counts once.
        </p>
      </div>

      {polls.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          No polls yet. When your teacher publishes one, it will show up here.
        </p>
      ) : (
        <ul className="space-y-3">
          {polls.map((p) => {
            const votes = p.options.reduce((s, o) => s + o.count, 0);
            return (
              <li key={p.id}>
                <Link
                  href={`/poll/${p.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-600"
                >
                  <p className="font-medium text-slate-900 dark:text-white">{p.prompt}</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {votes} vote{votes === 1 ? "" : "s"} · tap to open voting page
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/teacher" className="text-sm text-slate-600 underline dark:text-slate-400">
        Teacher hub
      </Link>
    </div>
  );
}
