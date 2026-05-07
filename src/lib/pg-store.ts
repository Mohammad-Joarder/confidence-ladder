import postgres from "postgres";
import type { AppData } from "./types";
import { emptyStore } from "./types";
import { normalizeAppData } from "./store-normalize";

type Sqlish = { json(value: postgres.JSONValue): postgres.Parameter };

function sqlJson(sql: Sqlish, data: AppData) {
  const normalized = normalizeAppData(data);
  return sql.json(JSON.parse(JSON.stringify(normalized)) as postgres.JSONValue);
}

let sqlInstance: ReturnType<typeof postgres> | null = null;
let schemaPromise: Promise<void> | null = null;

function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!sqlInstance) {
    sqlInstance = postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }
  return sqlInstance;
}

async function ensureSchema(sql: ReturnType<typeof postgres>): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS quietboard_store (
          id INTEGER PRIMARY KEY,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT quietboard_store_singleton CHECK (id = 1)
        )
      `;
      const seed = emptyStore();
      await sql`
        INSERT INTO quietboard_store (id, data)
        VALUES (1, ${sqlJson(sql, seed)})
        ON CONFLICT (id) DO NOTHING
      `;
    })();
  }
  await schemaPromise;
}

export async function readPg(): Promise<AppData> {
  const sql = getSql();
  await ensureSchema(sql);
  const rows = await sql`SELECT data FROM quietboard_store WHERE id = 1`;
  if (!rows.length) return emptyStore();
  return normalizeAppData(rows[0].data as AppData);
}

export async function writePg(data: AppData): Promise<void> {
  const sql = getSql();
  await ensureSchema(sql);
  const normalized = normalizeAppData(data);
  await sql`
    UPDATE quietboard_store
    SET data = ${sqlJson(sql, normalized)}, updated_at = now()
    WHERE id = 1
  `;
}

export async function mutatePg(fn: (draft: AppData) => void): Promise<AppData> {
  const sql = getSql();
  await ensureSchema(sql);
  return sql.begin(async (tx) => {
    const rows = await tx`
      SELECT data FROM quietboard_store WHERE id = 1 FOR UPDATE
    `;
    if (!rows.length) {
      throw new Error("[pg-store] quietboard_store row missing after schema init");
    }
    const current = normalizeAppData(rows[0].data as AppData);
    fn(current);
    const normalized = normalizeAppData(current);
    await tx`
      UPDATE quietboard_store
      SET data = ${sqlJson(tx, normalized)}, updated_at = now()
      WHERE id = 1
    `;
    return normalized;
  });
}
