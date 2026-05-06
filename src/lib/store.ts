import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { BlobNotFoundError, head, put } from "@vercel/blob";
import { unstable_noStore as noStore } from "next/cache";
import type { AppData, Poll } from "./types";
import { emptyStore } from "./types";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
const BLOB_PATHNAME = "confidence-ladder/store.json";

function useBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

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
    console.error(
      "[store] readLocal failed (file exists but unreadable — not overwriting)",
      e,
    );
    throw new Error(
      "LOCAL_STORE_READ_FAILED: Could not read data/store.json. Repair the file or restore from backup.",
    );
  }
}

async function writeLocal(data: AppData): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function readBlob(): Promise<AppData> {
  try {
    const meta = await head(BLOB_PATHNAME);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Blob download failed: HTTP ${res.status}`);
    }
    const text = await res.text();
    if (!text.trim()) {
      throw new Error("Blob body empty");
    }
    return normalize(JSON.parse(text) as AppData);
  } catch (e: unknown) {
    if (e instanceof BlobNotFoundError) {
      return emptyStore();
    }
    console.error(
      "[store] readBlob failed — not substituting empty store (prevents data wipe on transient errors)",
      e,
    );
    throw new Error(
      "BLOB_STORE_READ_FAILED: Could not load remote store. Fix Blob env/network and retry; no changes were saved.",
    );
  }
}

async function writeBlob(data: AppData): Promise<void> {
  await put(BLOB_PATHNAME, JSON.stringify(data), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
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
  if (useBlob()) return readBlob();
  return readLocal();
}

export async function saveStore(data: AppData): Promise<void> {
  if (useBlob()) await writeBlob(data);
  else await writeLocal(data);
}

/** Serialize mutations safely for MVP (single writer per deployment scale). */
export async function mutateStore(fn: (draft: AppData) => void): Promise<AppData> {
  const current = await loadStore();
  fn(current);
  await saveStore(current);
  return current;
}
