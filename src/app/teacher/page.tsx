"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { SessionDatePicker } from "@/components/SessionDatePicker";
import { StatusLegend } from "@/components/StatusLegend";
import { isRichTextEmpty } from "@/lib/html-plain";
import {
  combineDateAndTimeToIso,
  formatLocalDateLabel,
  formatTimePickerDisplay,
  looksLikeFullUuid,
  normalizeIdFragment,
} from "@/lib/datetime-local";

const STORAGE_KEY = "qa_teacher_secret_v1";

type QuestionLite = { id: string; title: string; status: "pending" | "answered" };
type NoticeTone = "success" | "error" | "info";

type PollPublic = {
  id: string;
  prompt: string;
  options: { id: string; label: string; count: number }[];
  createdAt: string;
};

export default function TeacherPage() {
  const [secret, setSecret] = useState("");
  const [stored, setStored] = useState<string | null>(null);
  const [requiresSecret, setRequiresSecret] = useState<boolean>(true);

  const [questions, setQuestions] = useState<QuestionLite[]>([]);
  const [questionId, setQuestionId] = useState("");
  const [answerBody, setAnswerBody] = useState("");
  const [answerEditorKey, setAnswerEditorKey] = useState(0);
  const [live, setLive] = useState(false);

  const [sessionTopic, setSessionTopic] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [sessionUrl, setSessionUrl] = useState("");

  const [pollPrompt, setPollPrompt] = useState("Did this explanation click?");
  const [teacherPolls, setTeacherPolls] = useState<PollPublic[]>([]);
  const [lastCreatedPoll, setLastCreatedPoll] = useState<{ id: string; prompt: string } | null>(
    null,
  );

  const [sessionDateOpen, setSessionDateOpen] = useState(false);
  const [sessionTimeOpen, setSessionTimeOpen] = useState(false);
  const sessionDateWrapRef = useRef<HTMLDivElement>(null);
  const sessionTimeWrapRef = useRef<HTMLDivElement>(null);

  const [msg, setMsg] = useState("");
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("info");

  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<null | {
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "default" | "danger";
  }>(null);

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.id === questionId),
    [questions, questionId],
  );

  const unlocked = !requiresSecret || Boolean(stored);

  function showNotice(text: string, tone: NoticeTone) {
    setMsg(text);
    setNoticeTone(tone);
  }

  function finishConfirm(ok: boolean) {
    confirmResolveRef.current?.(ok);
    confirmResolveRef.current = null;
    setConfirmDialog(null);
  }

  function requestConfirm(opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "default" | "danger";
  }) {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmDialog(opts);
    });
  }

  async function refreshQuestions() {
    try {
      const res = await fetch("/api/questions");
      const d = await res.json();
      const list = (d.questions ?? []) as Array<{
        id: string;
        title: string;
        status: "pending" | "answered";
      }>;
      setQuestions(
        list.map((q) => ({
          id: q.id,
          title: q.title,
          status: q.status,
        })),
      );
    } catch {
      setQuestions([]);
    }
  }

  async function refreshPolls() {
    try {
      const res = await fetch("/api/polls", { cache: "no-store" });
      const d = await res.json();
      const list = Array.isArray(d.polls) ? (d.polls as PollPublic[]) : [];
      setTeacherPolls(list);
    } catch {
      setTeacherPolls([]);
    }
  }

  async function copyPollLink(pollId: string) {
    const path = `/poll/${pollId}`;
    const full =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    try {
      await navigator.clipboard.writeText(full);
      showNotice("Vote link copied to clipboard.", "success");
    } catch {
      showNotice(`Copy manually: ${full}`, "info");
    }
  }

  useEffect(() => {
    setStored(sessionStorage.getItem(STORAGE_KEY));

    void fetch("/api/teacher-status")
      .then((r) => r.json())
      .then((d) => setRequiresSecret(Boolean(d.requiresSecret)))
      .catch(() => setRequiresSecret(true));

    void refreshQuestions();
    void refreshPolls();
  }, []);

  useEffect(() => {
    if (!sessionDateOpen && !sessionTimeOpen) return;
    function handlePointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (sessionDateWrapRef.current?.contains(t)) return;
      if (sessionTimeWrapRef.current?.contains(t)) return;
      setSessionDateOpen(false);
      setSessionTimeOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [sessionDateOpen, sessionTimeOpen]);

  useEffect(() => {
    if (!sessionDateOpen && !sessionTimeOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSessionDateOpen(false);
        setSessionTimeOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sessionDateOpen, sessionTimeOpen]);

  async function saveSecret() {
    const ok = await requestConfirm({
      title: "Save teacher secret?",
      message:
        "This saves your teacher secret in this browser session only (sessionStorage). Anyone using this device could unlock teacher actions until you close the tab.",
      confirmLabel: "Save secret",
    });
    if (!ok) return;
    sessionStorage.setItem(STORAGE_KEY, secret.trim());
    setStored(secret.trim());
    showNotice("Teacher secret saved for this browser session.", "success");
  }

  const headers = (): HeadersInit => ({
    "Content-Type": "application/json",
    "x-teacher-secret": stored ?? "",
  });

  async function lookupQuestion() {
    const rawInput = questionId.trim();
    if (!rawInput) {
      showNotice("Paste part or all of a Question ID, then tap Fetch title.", "error");
      return;
    }

    let latestList: QuestionLite[] = questions;
    try {
      const res = await fetch("/api/questions", { cache: "no-store" });
      const d = await res.json();
      latestList = ((d.questions ?? []) as QuestionLite[]).map((q) => ({
        id: q.id,
        title: q.title,
        status: q.status,
      }));
      setQuestions(latestList);
    } catch {
      // keep existing list
    }

    const trimmed = rawInput.trim();

    if (looksLikeFullUuid(trimmed)) {
      const id = trimmed.toLowerCase();
      const res = await fetch(`/api/questions/${encodeURIComponent(id)}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) {
        showNotice(d.error ?? "Question not found", "error");
        return;
      }
      setQuestionId(id);
      showNotice(`Found: ${d.question?.title ?? "Question"}`, "success");
      return;
    }

    const needle = normalizeIdFragment(trimmed);
    if (needle.length < 4) {
      showNotice("Enter at least 4 characters of the Question ID (no dashes needed).", "error");
      return;
    }

    const matches = latestList.filter((q) => normalizeIdFragment(q.id).startsWith(needle));

    if (matches.length === 1) {
      setQuestionId(matches[0].id);
      showNotice(`Found: ${matches[0].title}`, "success");
      return;
    }

    if (matches.length > 1) {
      showNotice(
        `${matches.length} questions match that prefix. Paste more characters or pick from the dropdown.`,
        "error",
      );
      return;
    }

    showNotice(
      "No question matches. Copy the full Question ID from the board or question page, or choose from the dropdown.",
      "error",
    );
  }

  async function postAnswer() {
    const id = questionId.trim();
    if (!unlocked || !id) return;
    const ok = await requestConfirm({
      title: "Post this answer?",
      message: "Students will see this reply immediately on the question page.",
      confirmLabel: "Post answer",
    });
    if (!ok) return;

    const res = await fetch(`/api/questions/${id}/answers`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ body: answerBody }),
    });
    const d = await res.json();
    if (!res.ok) {
      showNotice(d.error ?? "Failed", "error");
      return;
    }

    showNotice("Answer posted successfully.", "success");
    setAnswerBody("");
    setAnswerEditorKey((k) => k + 1);
    await refreshQuestions();
  }

  async function patchLive() {
    const id = questionId.trim();
    if (!unlocked || !id) return;
    const action = live ? "Mark for live clarification?" : "Remove live clarification?";
    const ok = await requestConfirm({
      title: action,
      message: live
        ? "Students will see the Live session badge on this question until you turn it off."
        : "The Live session badge will be removed from this question.",
      confirmLabel: live ? "Mark live" : "Remove live mark",
    });
    if (!ok) return;

    const res = await fetch(`/api/questions/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ markedLiveClarification: live }),
    });
    const d = await res.json();
    if (!res.ok) {
      showNotice(d.error ?? "Failed", "error");
      return;
    }
    showNotice(`Live flag updated: ${d.question?.markedLiveClarification ? "ON" : "OFF"}.`, "success");
  }

  async function createSession() {
    if (!unlocked) return;
    const ok = await requestConfirm({
      title: "Create live session?",
      message: "This publishes a scheduled doubt session students can open from the Sessions page.",
      confirmLabel: "Create session",
    });
    if (!ok) return;

    const startsAt = combineDateAndTimeToIso(sessionDate, sessionTime);
    if (!startsAt) {
      showNotice("Pick a valid date and time for the session.", "error");
      return;
    }

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        topic: sessionTopic,
        startsAt,
        meetingUrl: sessionUrl || undefined,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      showNotice(d.error ?? "Failed", "error");
      return;
    }

    showNotice(`Session created. ID: ${d.session?.id}`, "success");
    setSessionTopic("");
    setSessionDate("");
    setSessionTime("");
    setSessionUrl("");
  }

  async function createPoll() {
    if (!unlocked) return;
    const ok = await requestConfirm({
      title: "Publish anonymous poll?",
      message: "Students can vote immediately using the poll link. This cannot be undone from the UI in this MVP.",
      confirmLabel: "Create poll",
      variant: "danger",
    });
    if (!ok) return;

    const res = await fetch("/api/polls", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        prompt: pollPrompt,
        options: [{ label: "Yes" }, { label: "Not yet" }],
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      showNotice(d.error ?? "Failed", "error");
      return;
    }
    const created = d.poll as PollPublic | undefined;
    if (created?.id) {
      setLastCreatedPoll({ id: created.id, prompt: created.prompt });
    }
    await refreshPolls();
    showNotice(
      "Poll published — use Open voting page below, or tell students to open Polls in the header.",
      "success",
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message ?? ""}
        confirmLabel={confirmDialog?.confirmLabel}
        variant={confirmDialog?.variant}
        onConfirm={() => finishConfirm(true)}
        onCancel={() => finishConfirm(false)}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Teacher control center
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Manage classroom questions through a guided workflow. Each write operation asks for
          confirmation before changes are applied.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">Quick workflow</h2>
        <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <li>Check access mode below.</li>
          <li>Select a question by dropdown or paste ID and fetch title.</li>
          <li>Post answer and optionally toggle live clarification flag.</li>
          <li>Create sessions and polls when needed.</li>
        </ol>
      </section>

      <StatusLegend compact />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">Access status</h2>
        {requiresSecret ? (
          <>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This environment requires{" "}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                TEACHER_SECRET
              </code>
              . Paste once per browser session.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="password"
                className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                placeholder="TEACHER_SECRET"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
              <button
                type="button"
                className="min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-emerald-600"
                onClick={() => void saveSecret()}
              >
                Save
              </button>
            </div>
            {stored && (
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">Unlocked.</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
            Open teacher mode (no secret required in this environment).
          </p>
        )}
      </section>

      {msg && (
        <p
          className={`rounded-xl border px-3 py-2 text-sm ${
            noticeTone === "error"
              ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              : noticeTone === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          }`}
        >
          {msg}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">Step 1 - Answer question</h2>

        <label className="mt-3 block text-sm">
          Select question (ID + title)
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={questionId}
            onChange={(e) => setQuestionId(e.target.value)}
          >
            <option value="">Select a question...</option>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                [{q.id.slice(0, 8)}] {q.title} ({q.status})
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-sm">
          Or paste Question ID (full UUID or first characters)
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              className="min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value)}
              placeholder="e.g. f8c3b2a1… or full UUID"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="min-h-11 shrink-0 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-600"
              onClick={() => void lookupQuestion()}
            >
              Fetch title
            </button>
          </div>
          <span className="mt-1 block text-xs text-slate-500">
            Matches against loaded questions; full UUID checks the server directly.
          </span>
        </label>

        {selectedQuestion && (
          <p className="mt-2 text-xs text-slate-500">Selected: {selectedQuestion.title}</p>
        )}

        <div className="mt-3 block text-sm">
          <span className="block font-medium text-slate-900 dark:text-slate-100">Answer</span>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Rich text and pasted images supported (same as student questions).
          </p>
          <div className="mt-2">
            <RichTextEditor
              editorKey={answerEditorKey}
              initialHtml={answerBody}
              onChange={setAnswerBody}
              disabled={!unlocked}
              placeholder="Write the official answer… Paste images if helpful."
            />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          Mark for live clarification session
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!unlocked || !questionId.trim() || isRichTextEmpty(answerBody)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            onClick={() => void postAnswer()}
          >
            Post answer
          </button>
          <button
            type="button"
            disabled={!unlocked || !questionId.trim()}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40 dark:border-slate-600"
            onClick={() => void patchLive()}
          >
            Update live flag
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">
          Step 2 - Schedule live session
        </h2>
        <label className="mt-3 block text-sm">
          Topic
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={sessionTopic}
            onChange={(e) => setSessionTopic(e.target.value)}
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:items-start">
          <div ref={sessionDateWrapRef} className="relative">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Date
            </span>
            <button
              type="button"
              id="teacher-session-date-trigger"
              aria-expanded={sessionDateOpen}
              aria-haspopup="dialog"
              className={`mt-1 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm outline-none ring-emerald-500/30 transition-shadow focus-visible:ring-4 dark:bg-slate-950 ${
                sessionDateOpen
                  ? "border-emerald-500 dark:border-emerald-500"
                  : "border-slate-200 dark:border-slate-700"
              }`}
              onClick={() => {
                setSessionTimeOpen(false);
                setSessionDateOpen((o) => !o);
              }}
            >
              <span className={sessionDate.trim() ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                {sessionDate.trim()
                  ? formatLocalDateLabel(sessionDate)
                  : "Click to choose date"}
              </span>
              <span className="text-slate-400" aria-hidden>
                ▾
              </span>
            </button>
            {sessionDateOpen && (
              <div
                role="dialog"
                aria-labelledby="teacher-session-date-trigger"
                className="absolute left-0 right-0 z-50 mt-1 rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:left-0 sm:right-auto sm:min-w-[300px]"
              >
                <SessionDatePicker
                  embedded
                  value={sessionDate}
                  onChange={(v) => {
                    setSessionDate(v);
                    setSessionDateOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          <div ref={sessionTimeWrapRef} className="relative">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Start time
            </span>
            <button
              type="button"
              id="teacher-session-time-trigger"
              aria-expanded={sessionTimeOpen}
              aria-haspopup="dialog"
              className={`mt-1 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm outline-none ring-emerald-500/30 transition-shadow focus-visible:ring-4 dark:bg-slate-950 ${
                sessionTimeOpen
                  ? "border-emerald-500 dark:border-emerald-500"
                  : "border-slate-200 dark:border-slate-700"
              }`}
              onClick={() => {
                setSessionDateOpen(false);
                setSessionTimeOpen((o) => !o);
              }}
            >
              <span className={sessionTime.trim() ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                {sessionTime.trim()
                  ? formatTimePickerDisplay(sessionTime)
                  : "Click to choose time"}
              </span>
              <span className="text-slate-400" aria-hidden>
                ▾
              </span>
            </button>
            {sessionTimeOpen && (
              <div
                role="dialog"
                aria-labelledby="teacher-session-time-trigger"
                className="absolute left-0 right-0 z-50 mt-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:left-0 sm:right-auto sm:min-w-[260px]"
              >
                <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Time
                  <input
                    type="time"
                    autoFocus
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-950"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white dark:bg-emerald-600"
                  onClick={() => setSessionTimeOpen(false)}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Date and time use your device timezone when the session is created.
        </p>
        <label className="mt-3 block text-sm">
          Meeting URL (optional)
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={sessionUrl}
            onChange={(e) => setSessionUrl(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!unlocked || !sessionTopic.trim() || !sessionDate || !sessionTime}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          onClick={() => void createSession()}
        >
          Create session
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">
          Step 3 - Create anonymous poll
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          After publishing, students vote from the{" "}
          <Link href="/polls" className="font-medium text-emerald-700 underline dark:text-emerald-400">
            Polls
          </Link>{" "}
          link in the header, or from the links below.
        </p>
        <label className="mt-3 block text-sm">
          Prompt
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={pollPrompt}
            onChange={(e) => setPollPrompt(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!unlocked || !pollPrompt.trim()}
          className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          onClick={() => void createPoll()}
        >
          Create poll
        </button>

        {lastCreatedPoll && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-900 dark:bg-emerald-950/35">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Latest poll
            </p>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
              {lastCreatedPoll.prompt}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/poll/${lastCreatedPoll.id}`}
                className="inline-flex min-h-11 items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Open voting page
              </Link>
              <button
                type="button"
                className="min-h-11 rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-500 dark:text-emerald-200"
                onClick={() => void copyPollLink(lastCreatedPoll.id)}
              >
                Copy vote link
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900 dark:text-white">Active polls</h2>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-600"
            onClick={() => void refreshPolls()}
          >
            Refresh list
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Same list students see under Polls in the navigation bar.
        </p>
        {teacherPolls.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No polls loaded yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {teacherPolls.map((p) => {
              const votes = p.options.reduce((s, o) => s + o.count, 0);
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">{p.prompt}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {votes} vote{votes === 1 ? "" : "s"} · id {p.id.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/poll/${p.id}`}
                      className="inline-flex min-h-10 items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Vote / preview
                    </Link>
                    <button
                      type="button"
                      className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-600"
                      onClick={() => void copyPollLink(p.id)}
                    >
                      Copy link
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link href="/" className="text-sm text-slate-600 underline dark:text-slate-400">
        ← Back to board
      </Link>
    </div>
  );
}
