export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function pruneOlderThan<T extends { createdAt: string }>(items: T[], cutoffMs: number): T[] {
  const cutoff = Date.now() - cutoffMs;
  return items.filter((x) => {
    const t = Date.parse(x.createdAt);
    return !Number.isNaN(t) && t >= cutoff;
  });
}
