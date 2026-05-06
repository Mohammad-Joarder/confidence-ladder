import { createHash, randomUUID } from "crypto";

export function newId(): string {
  return randomUUID();
}

export function fingerprint(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

/** Stable pseudonymous key for participation tracking (not reversible without secret). */
export function participationKey(clientStudentToken: string): string {
  const secret = process.env.DATA_SECRET ?? process.env.TEACHER_SECRET ?? "dev-only-change-me";
  return fingerprint(`${secret}:${clientStudentToken}`);
}
