"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DoubtSession } from "@/lib/types";
import { dateKeyLocal } from "@/lib/datetime-local";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonthGrid(year: number, monthIndex: number): (number | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function monthLabel(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function dayKey(year: number, monthIndex: number, day: number) {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function SessionsCalendar({ initialSessions }: { initialSessions: DoubtSession[] }) {
  const today = new Date();
  const [cursorYear, setCursorYear] = useState(today.getFullYear());
  const [cursorMonth, setCursorMonth] = useState(today.getMonth());
  const [pickDayKey, setPickDayKey] = useState<string | null>(null);
  const [detailSession, setDetailSession] = useState<DoubtSession | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, DoubtSession[]>();
    for (const s of initialSessions) {
      const key = dateKeyLocal(s.startsAt);
      if (!key) continue;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(s);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    }
    return m;
  }, [initialSessions]);

  const grid = useMemo(() => buildMonthGrid(cursorYear, cursorMonth), [cursorYear, cursorMonth]);

  function prevMonth() {
    if (cursorMonth === 0) {
      setCursorMonth(11);
      setCursorYear((y) => y - 1);
    } else setCursorMonth((m) => m - 1);
  }

  function nextMonth() {
    if (cursorMonth === 11) {
      setCursorMonth(0);
      setCursorYear((y) => y + 1);
    } else setCursorMonth((m) => m + 1);
  }

  const sessionsForPickedDay = pickDayKey ? byDay.get(pickDayKey) ?? [] : [];

  function closeOverlays() {
    setPickDayKey(null);
    setDetailSession(null);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {monthLabel(cursorYear, cursorMonth)}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-600"
              onClick={prevMonth}
            >
              Previous
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-600"
              onClick={nextMonth}
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>

        <div className="mt-1 space-y-1">
          {grid.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-1">
              {row.map((day, di) => {
                if (day === null) {
                  return <div key={`e-${ri}-${di}`} className="min-h-[3rem] rounded-xl bg-transparent" />;
                }
                const cellDayKey = dayKey(cursorYear, cursorMonth, day);
                const count = byDay.get(cellDayKey)?.length ?? 0;
                const isToday =
                  today.getFullYear() === cursorYear &&
                  today.getMonth() === cursorMonth &&
                  today.getDate() === day;

                return (
                  <button
                    key={cellDayKey}
                    type="button"
                    disabled={count === 0}
                    onClick={() => {
                      setDetailSession(null);
                      setPickDayKey(cellDayKey);
                    }}
                    className={`flex min-h-[3rem] flex-col items-center justify-start rounded-xl border px-1 py-2 text-sm transition ${
                      count > 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950"
                        : "cursor-default border-transparent text-slate-400 dark:text-slate-600"
                    } ${isToday ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900" : ""}`}
                  >
                    <span className="font-semibold">{day}</span>
                    {count > 0 && (
                      <span className="mt-1 text-[10px] font-medium uppercase tracking-wide">
                        {count} session{count === 1 ? "" : "s"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Tap a highlighted day to see session times and details. Days without sessions are inactive.
        </p>
      </div>

      {(pickDayKey !== null || detailSession !== null) && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={closeOverlays}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-sheet-title"
            className="relative z-[91] max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl"
            style={{
              paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="mx-auto mt-2 hidden h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600 sm:hidden" />

            {detailSession ? (
              <div className="p-5">
                <button
                  type="button"
                  className="mb-3 text-sm font-semibold text-emerald-700 underline dark:text-emerald-400"
                  onClick={() => setDetailSession(null)}
                >
                  ← Back to day
                </button>
                <h3 id="session-sheet-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                  {detailSession.topic}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-800 dark:text-slate-200">Starts:</span>{" "}
                  {new Date(detailSession.startsAt).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500">Session ID: {detailSession.id}</p>
                {detailSession.meetingUrl ? (
                  <a
                    href={detailSession.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Open join link
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No meeting link yet — check back later.</p>
                )}
                <button
                  type="button"
                  className="mt-6 min-h-12 w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold dark:border-slate-600"
                  onClick={closeOverlays}
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="p-5">
                <h3 id="session-sheet-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                  Sessions on {pickDayKey ? new Date(pickDayKey + "T12:00:00").toLocaleDateString() : ""}
                </h3>
                <ul className="mt-4 space-y-2">
                  {sessionsForPickedDay.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
                        onClick={() => setDetailSession(s)}
                      >
                        <span className="font-medium text-slate-900 dark:text-white">{s.topic}</span>
                        <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {new Date(s.startsAt).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {s.meetingUrl ? " · Has join link" : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-6 min-h-12 w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold dark:border-slate-600"
                  onClick={closeOverlays}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-semibold text-slate-900 dark:text-white">Upcoming list</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          {initialSessions.length === 0 && <li>No sessions scheduled.</li>}
          {initialSessions.map((s) => (
            <li key={s.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="font-medium text-slate-800 dark:text-slate-200">{s.topic}</span>
              <span>{new Date(s.startsAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/" className="text-sm text-slate-600 underline dark:text-slate-400">
        ← Board
      </Link>
    </div>
  );
}
