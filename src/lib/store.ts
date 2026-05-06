import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { unstable_noStore as noStore } from "next/cache";
import type { AppData, Poll } from "./types";
import { emptyStore } from "./types";

/**
 * Single JSON file on disk — no cloud blob SDK.
 * Default: `data/store.json` under the process cwd.
 * Set `STORE_JSON_PATH` to an absolute path if only `/tmp` is writable (some serverless).
 */
const STORE_PATH = path.resolve(
  process.env.STORE_JSON_PATH?.trim() || path.join(process.cwd(), "data", "store.json"),
);

async function readLocal(): Promise<AppData> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as AppData;
    return normalize(parsed);
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e !== null && "code" in e
        ? String((e as NodeJS.ErrnoException).code)
        : "";
    if (code === "ENOENT") {
      await mkdir(path.dirname(STORE_PATH), { recursive: true });
      const fresh = emptyStore();
      await writeFile(STORE_PATH, JSON.stringify(fresh, null, 2), "utf8");
      return fresh;
    }
    console.error("[store] read failed — not overwriting existing file blindly", e);
    throw new Error(
      `STORE_READ_FAILED: Could not read ${STORE_PATH}. Repair the file or set STORE_JSON_PATH.`,
    );
  }
}

async function writeLocal(data: AppData): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
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

/** Serialize mutations safely for MVP (single writer per deployment scale). */
export async function mutateStore(fn: (draft: AppData) => void): Promise<AppData> {
  const current = await loadStore();
  fn(current);
  await saveStore(current);
  return current;
}
