"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getClientToken } from "@/lib/client-token";
import { readJsonResponse } from "@/lib/read-json-response";
import Link from "next/link";

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "bot" | "you"; text: string }[]>([
    { role: "bot", text: "Hi — I’m here to nudge you toward asking. What feels unclear today?" },
  ]);
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [stage, setStage] = useState<string>("");
  const tracked = useRef(false);

  useEffect(() => {
    const token = getClientToken();
    if (!token || tracked.current) return;
    tracked.current = true;

    void fetch("/api/participation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientToken: token, kind: "page_view" }),
    })
      .then((r) => readJsonResponse<{ stage?: string }>(r))
      .then((d) => {
        setStage(d.stage ?? "");
      })
      .catch(() => {});

    void fetch(`/api/nudge?clientToken=${encodeURIComponent(token)}`)
      .then((r) => readJsonResponse<{ nudge?: unknown; message?: string }>(r))
      .then((d) => {
        if (d.nudge && d.message) setNudge(d.message);
      })
      .catch(() => {});
  }, []);

  const sendNickname = useCallback(async () => {
    const token = getClientToken();
    const nick = nickname.trim();
    if (!nick) return;
    const res = await fetch("/api/participation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientToken: token, kind: "set_nickname", nickname: nick }),
    });
    const d = await readJsonResponse<{ stage?: string }>(res);
    setStage(d.stage ?? "nickname");
    setNickname("");
    setMessages((m) => [...m, { role: "bot", text: `Saved nickname “${nick}”. Progress on the confidence ladder: ${d.stage}.` }]);
  }, [nickname]);

  const sendChat = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    setMessages((m) => [...m, { role: "you", text }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const d = await readJsonResponse<{ reply?: string; links?: { id: string; title: string }[] }>(res);
      let reply = d.reply as string;
      if (Array.isArray(d.links) && d.links.length) {
        reply += "\n\nSuggested threads:";
        for (const l of d.links as { id: string; title: string }[]) {
          reply += `\n• ${l.title}`;
        }
      }
      setMessages((m) => [...m, { role: "bot", text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Something went wrong. Try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }, [busy, input]);

  return (
    <>
      {nudge && (
        <div className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-50 md:left-auto md:right-6">
          <p className="font-medium">Gentle nudge</p>
          <p className="mt-1 opacity-90">{nudge}</p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/ask"
              className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
              onClick={() => setNudge(null)}
            >
              Ask anonymously
            </Link>
            <button type="button" className="text-xs underline opacity-80" onClick={() => setNudge(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        {open ? "Close" : "Assistant"}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex max-h-[min(420px,70vh)] w-[min(100vw-2rem,360px)] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Confidence ladder: <span className="font-semibold text-slate-800 dark:text-slate-100">{stage || "…"}</span>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "bot"
                    ? "self-start max-w-[95%] rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800"
                    : "self-end max-w-[95%] rounded-2xl bg-emerald-600 px-3 py-2 text-white"
                }
              >
                {m.text.split("\n").map((line, j) => (
                  <p key={j} className={j ? "mt-1" : ""}>
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 p-3 dark:border-slate-800">
            <p className="mb-2 text-xs text-slate-500">Nickname (optional — stays off anonymous posts)</p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950"
                placeholder="Pick a nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <button
                type="button"
                className="rounded-xl bg-slate-200 px-3 text-xs font-semibold dark:bg-slate-700"
                onClick={() => void sendNickname()}
              >
                Save
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-slate-200 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                placeholder="Type a worry or topic…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void sendChat()}
              />
              <button
                type="button"
                disabled={busy}
                className="rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void sendChat()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
