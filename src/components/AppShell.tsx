import Link from "next/link";
import type { ReactNode } from "react";
import { ChatAssistant } from "./ChatAssistant";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Quiet<span className="text-emerald-600 dark:text-emerald-400">Board</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              className="rounded-full bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
              href="/ask"
            >
              Ask
            </Link>
            <Link className="px-2 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" href="/sessions">
              Sessions
            </Link>
            <Link className="px-2 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" href="/polls">
              Polls
            </Link>
            <Link className="px-2 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" href="/teacher">
              Teacher
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <ChatAssistant />
    </>
  );
}
