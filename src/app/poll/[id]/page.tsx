"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getClientToken } from "@/lib/client-token";

type Poll = {
  id: string;
  prompt: string;
  options: { id: string; label: string; count: number }[];
};

function resolveRouteId(raw: string | string[] | undefined): string {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (typeof s !== "string" || !s.trim()) return "";
  try {
    return decodeURIComponent(s.trim());
  } catch {
    return s.trim();
  }
}

export default function PollVotePage() {
  const params = useParams();
  const id = useMemo(() => resolveRouteId(params.id), [params.id]);

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing">("loading");
  const [msg, setMsg] = useState<{ text: string; tone: "success" | "error" | "info" } | null>(
    null,
  );
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!id) {
      setPoll(null);
      setLoadState("missing");
      return;
    }

    let cancelled = false;
    setLoadState("loading");
    setPoll(null);
    setMsg(null);

    void fetch(`/api/polls/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (res) => {
        const d = (await res.json()) as { poll?: Poll; error?: string };
        if (cancelled) return;
        if (!res.ok || !d.poll) {
          setPoll(null);
          setLoadState("missing");
          return;
        }
        setPoll(d.poll);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setPoll(null);
          setLoadState("missing");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function vote(optionId: string) {
    if (!id || loadState !== "ready" || voting) return;

    setVoting(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/polls/${encodeURIComponent(id)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, clientToken: getClientToken() }),
      });
      const d = (await res.json()) as {
        poll?: Poll;
        duplicate?: boolean;
        error?: string;
      };

      if (d.poll) setPoll(d.poll);

      if (!res.ok) {
        setMsg({
          text: d.error ?? `Could not record vote (${res.status}).`,
          tone: "error",
        });
        return;
      }

      if (d.duplicate) {
        setMsg({ text: "Vote already counted for this device.", tone: "info" });
        return;
      }

      setMsg({ text: "Thanks — response recorded anonymously.", tone: "success" });
    } catch {
      setMsg({ text: "Network error — try again.", tone: "error" });
    } finally {
      setVoting(false);
    }
  }

  if (!id || loadState === "missing") {
    return (
      <div className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400">
          This poll link is invalid or the poll no longer exists.
        </p>
        <Link href="/" className="text-sm text-slate-600 underline dark:text-slate-400">
          ← Back to board
        </Link>
      </div>
    );
  }

  if (loadState === "loading" || !poll) {
    return <p className="text-slate-600 dark:text-slate-400">Loading poll…</p>;
  }

  const total = poll.options.reduce((s, o) => s + o.count, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{poll.prompt}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">Anonymous poll — no names stored.</p>

      <ul className="space-y-2">
        {poll.options.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              disabled={voting || !o.id}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:border-emerald-600"
              onClick={() => void vote(o.id)}
            >
              <span>{o.label}</span>
              <span className="text-sm text-slate-500">{total ? Math.round((o.count / total) * 100) : 0}%</span>
            </button>
          </li>
        ))}
      </ul>

      {msg && (
        <p
          className={`text-sm ${
            msg.tone === "error"
              ? "text-red-700 dark:text-red-400"
              : msg.tone === "success"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/polls" className="text-slate-600 underline dark:text-slate-400">
          All polls
        </Link>
        <Link href="/teacher" className="text-slate-600 underline dark:text-slate-400">
          Teacher hub
        </Link>
      </div>
    </div>
  );
}
