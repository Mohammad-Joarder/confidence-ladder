"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { getClientToken } from "@/lib/client-token";
import { isRichTextEmpty } from "@/lib/html-plain";

export default function AskPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [authorDisplay, setAuthorDisplay] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          anonymous,
          authorDisplay: anonymous ? undefined : authorDisplay,
          tags: tagList,
          clientToken: getClientToken(),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      router.push(`/q/${d.question.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Ask a question</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Defaults to anonymous — nothing tied to your name appears on the board.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Title
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-950"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="One line summary"
          />
        </label>

        <div className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          <span className="block">Details</span>
          <p className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">
            Formatting, links, and pasted images (embedded) are supported.
          </p>
          <div className="mt-2">
            <RichTextEditor initialHtml={body} onChange={setBody} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          Ask anonymously
        </label>

        {!anonymous && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Your name (shown on board)
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              value={authorDisplay}
              onChange={(e) => setAuthorDisplay(e.target.value)}
            />
          </label>
        )}

        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Tags (comma separated)
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. calculus, homework 4"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !title.trim() || isRichTextEmpty(body)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => void submit()}
          >
            {busy ? "Posting…" : "Post question"}
          </button>
          <Link href="/" className="rounded-xl px-4 py-2 text-sm text-slate-600 underline dark:text-slate-400">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
