"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getClientToken } from "@/lib/client-token";

export function QuestionActions({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function upvote() {
    setBusy(true);
    try {
      await fetch(`/api/questions/${questionId}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientToken: getClientToken() }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy}
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-600"
        onClick={() => void upvote()}
      >
        Upvote
      </button>
    </div>
  );
}
