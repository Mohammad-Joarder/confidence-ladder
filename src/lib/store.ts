import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { unstable_noStore as noStore } from "next/cache";
import type { AppData, Poll } from "./types";
import { emptyStore } from "./types";

const TMP_FALLBACK = path.join("/tmp", "confidence-ladder-store.json");

/**
 * Resolve at request time (not module load) so Netlify env vars are visible.
 * Netlify/Vercel lambdas: read-only deploy dir — use /tmp unless STORE_JSON_PATH is set.
 */
function getStorePath(): string {
  const envPath = process.env.STORE_JSON_PATH?.trim();
  if (envPath) return path.resolve(envPath);

  const netlify =
    process.env.NETLIFY === "true" ||
    Boolean(process.env.NETLIFY_SITE_ID) ||
    Boolean(process.env.NETLIFY_SITE_NAME);
  const vercel = Boolean(process.env.VERCEL);

  if (netlify || vercel) {
    return TMP_FALLBACK;
  }

  return path.join(process.cwd(), "data", "store.json");
}

async function readLocal(): Promise<AppData> {
  const storePath = getStorePath();

  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as AppData;
    return normalize(parsed);
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e
        ? String((e as NodeJS.ErrnoException).code)
        : "";
    if (code === "ENOENT") {
      try {
        await mkdir(path.dirname(storePath), { recursive: true });
        const fresh = emptyStore();
        await writeFile(storePath, JSON.stringify(fresh, null, 2), "utf8");
        return fresh;
      } catch (writeErr) {
        console.error("[store] create initial store failed", storePath, writeErr);
        throw new Error(
          `STORE_WRITE_FAILED: Cannot write ${storePath}. On Netlify/Vercel use default /tmp path or set STORE_JSON_PATH.`,
        );
      }
    }
    console.error("[store] read failed — not overwriting existing file blindly", e);
    throw new Error(
      `STORE_READ_FAILED: Could not read ${storePath}. Repair the file or set STORE_JSON_PATH.`,
    );
  }
}

async function writeLocal(data: AppData): Promise<void> {
  const storePath = getStorePath();
  await mkdir(path.dirname(storePath), { recursive: true });
  const tmpPath = `${storePath}.tmp`;
  await writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
  await rename(tmpPath, storePath);
}

function normalizePoll(p: Poll): Poll {
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

function normalize(raw: AppData): AppData {
  return {
    questions: raw.questions ?? [],
    answers: raw.answers ?? [],
    sessions: raw.sessions ?? [],
    polls: (raw.polls ?? []).map((p) => normalizePoll(p as Poll)),
    participation: raw.participation ?? {},
  };
}

export async function loadStore(): Promise<AppData> {
  noStore();
  return readLocal();
}

export async function saveStore(data: AppData): Promise<void> {
  await writeLocal(data);
}

let mutationQueue: Promise<unknown> = Promise.resolve();

/**
 * Serialize mutations to avoid lost updates under concurrent requests.
 * This protects consistency for low-scale single-instance deployments.
 */
export async function mutateStore(fn: (draft: AppData) => void): Promise<AppData> {
  const run = async (): Promise<AppData> => {
    const current = await readLocal();
    fn(current);
    await writeLocal(current);
    return current;
  };

  const result = mutationQueue.then(run, run);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
