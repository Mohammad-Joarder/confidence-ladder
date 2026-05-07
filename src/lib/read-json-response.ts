/**
 * Parse JSON from a fetch Response. HTML error pages (e.g. 404/500) produce a clear error instead of JSON.parse throwing.
 */
export async function readJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error(
      `Server returned a web page instead of JSON (HTTP ${res.status}). The API route may have crashed, the URL may be wrong, or the request may be too large (try smaller pasted images). Check deployment logs.`,
    );
  }
  if (trimmed.startsWith("<")) {
    throw new Error(
      `Server returned HTML instead of JSON (HTTP ${res.status}). Check the request URL and server logs.`,
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      `Invalid JSON from server (HTTP ${res.status}): ${trimmed.slice(0, 180)}${trimmed.length > 180 ? "…" : ""}`,
    );
  }
}
