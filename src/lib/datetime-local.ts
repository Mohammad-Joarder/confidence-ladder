/** Local calendar date key YYYY-MM-DD from an ISO timestamp (browser local TZ). */
export function dateKeyLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Combine HTML date + time inputs into ISO UTC string for API. */
export function combineDateAndTimeToIso(dateStr: string, timeStr: string): string | null {
  if (!dateStr?.trim() || !timeStr?.trim()) return null;
  const local = new Date(`${dateStr.trim()}T${timeStr.trim()}`);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

/** Normalize id fragment for prefix compare (lowercase, no dashes/spaces). */
export function normalizeIdFragment(s: string): string {
  return s.toLowerCase().replace(/-/g, "").replace(/\s/g, "");
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function looksLikeFullUuid(s: string): boolean {
  return UUID_REGEX.test(s.trim());
}

/** Readable date label for a YYYY-MM-DD value (local calendar interpretation). */
export function formatLocalDateLabel(yyyyMmDd: string): string {
  const trimmed = yyyyMmDd.trim();
  if (!trimmed) return "";
  const local = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(local.getTime())) return trimmed;
  return local.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Readable time from an HTML time value (HH:mm or HH:mm:ss). */
export function formatTimePickerDisplay(timeStr: string): string {
  const t = timeStr.trim();
  if (!t) return "";
  const [hh, mm] = t.split(":");
  const h = Number(hh);
  const m = Number(mm ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return t;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
