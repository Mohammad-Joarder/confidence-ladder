import Link from "next/link";
import { SessionsCalendar } from "./sessions-calendar";
import { loadStore } from "@/lib/store";

export default async function SessionsPage() {
  let store;
  try {
    store = await loadStore();
  } catch {
    return (
      <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
        <h1 className="text-2xl font-semibold text-red-900 dark:text-red-200">
          Can&apos;t load sessions
        </h1>
        <p className="text-sm text-red-800 dark:text-red-300">
          Saved data could not be read. Fix storage configuration or data/store.json and try again.
        </p>
        <Link href="/" className="text-sm underline">
          ← Back to board
        </Link>
      </div>
    );
  }
  const sessions = [...store.sessions].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Doubt sessions</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Live clarification times shared by teachers — browse by calendar or list.
        </p>
      </div>

      <SessionsCalendar initialSessions={sessions} />
    </div>
  );
}
