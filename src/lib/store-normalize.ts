import type { AppData, Poll } from "./types";

export function normalizePoll(p: Poll): Poll {
  return {
    ...p,
    voterFingerprints: Array.isArray(p.voterFingerprints) ? p.voterFingerprints : [],
    options: Array.isArray(p.options)
      ? p.options.map((o) => ({
          id: String(o.id ?? ""),
          label: String(o.label ?? ""),
          count: typeof o.count === "number" && Number.isFinite(o.count) ? o.count : 0,
        }))
      : [],
  };
}

export function normalizeAppData(raw: AppData): AppData {
  return {
    questions: raw.questions ?? [],
    answers: raw.answers ?? [],
    sessions: raw.sessions ?? [],
    polls: (raw.polls ?? []).map((p) => normalizePoll(p as Poll)),
    participation: raw.participation ?? {},
  };
}
