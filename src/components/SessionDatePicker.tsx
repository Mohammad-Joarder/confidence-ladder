"use client";

import { useEffect, useMemo, useState } from "react";

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

function parseDateKey(key: string): { y: number; mo: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return { y, mo, d };
}

function labelFromKey(key: string): string {
  const p = parseDateKey(key);
  if (!p) return "";
  return new Date(p.y, p.mo, p.d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SessionDatePicker({
  value,
  onChange,
  embedded = false,
}: {
  value: string;
  onChange: (yyyyMmDd: string) => void;
  /** Compact layout for use inside a popover under a text trigger. */
  embedded?: boolean;
}) {
  const today = new Date();
  const ty = today.getFullYear();
  const tm = today.getMonth();
  const td = today.getDate();
  const todayKey = dayKey(ty, tm, td);

  const [cursorYear, setCursorYear] = useState(ty);
  const [cursorMonth, setCursorMonth] = useState(tm);

  useEffect(() => {
    if (!value.trim()) return;
    const p = parseDateKey(value);
    if (p) {
      setCursorYear(p.y);
      setCursorMonth(p.mo);
    }
  }, [value]);

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

  function goToday() {
    setCursorYear(ty);
    setCursorMonth(tm);
    onChange(todayKey);
  }

  const shellClass = embedded
    ? "rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50"
    : "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50";

  return (
    <div className={shellClass}>
      {!embedded && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Session date
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                {value.trim() ? labelFromKey(value) : "Pick a day"}
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-300"
              onClick={goToday}
            >
              Today
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              className="min-h-10 rounded-xl border border-slate-300 px-3 text-sm font-semibold dark:border-slate-600"
              onClick={prevMonth}
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {monthLabel(cursorYear, cursorMonth)}
            </span>
            <button
              type="button"
              aria-label="Next month"
              className="min-h-10 rounded-xl border border-slate-300 px-3 text-sm font-semibold dark:border-slate-600"
              onClick={nextMonth}
            >
              ›
            </button>
          </div>
        </>
      )}

      {embedded && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 items-center justify-center gap-1 sm:justify-start">
            <button
              type="button"
              aria-label="Previous month"
              className="min-h-9 rounded-lg border border-slate-300 px-2.5 text-sm font-semibold dark:border-slate-600"
              onClick={prevMonth}
            >
              ‹
            </button>
            <span className="min-w-[9.5rem] text-center text-sm font-semibold text-slate-800 dark:text-slate-200">
              {monthLabel(cursorYear, cursorMonth)}
            </span>
            <button
              type="button"
              aria-label="Next month"
              className="min-h-9 rounded-lg border border-slate-300 px-2.5 text-sm font-semibold dark:border-slate-600"
              onClick={nextMonth}
            >
              ›
            </button>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-300"
            onClick={goToday}
          >
            Today
          </button>
        </div>
      )}

      <div
        className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400"
        role="grid"
        aria-label="Choose session date"
      >
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1.5" role="columnheader">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-0.5 space-y-0.5">
        {grid.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-0.5" role="row">
            {row.map((day, di) => {
              if (day === null) {
                return <div key={`e-${ri}-${di}`} className="min-h-10" />;
              }
              const cellDayKey = dayKey(cursorYear, cursorMonth, day);
              const isPast = cellDayKey < todayKey;
              const selected = value === cellDayKey;
              const isTodayCell = cellDayKey === todayKey;

              return (
                <button
                  key={di}
                  type="button"
                  role="gridcell"
                  disabled={isPast}
                  aria-selected={selected}
                  aria-label={cellDayKey}
                  onClick={() => onChange(cellDayKey)}
                  className={`relative flex min-h-10 items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                    isPast
                      ? "cursor-not-allowed text-slate-300 dark:text-slate-600"
                      : selected
                        ? "bg-emerald-600 text-white shadow-sm dark:bg-emerald-500"
                        : "text-slate-800 hover:bg-white hover:shadow-sm dark:text-slate-100 dark:hover:bg-slate-800"
                  } ${!selected && !isPast && isTodayCell ? "ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950/50" : ""}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {!embedded && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Past dates are disabled. Time is set separately.
        </p>
      )}
      {embedded && (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Past dates are disabled.
        </p>
      )}
    </div>
  );
}
