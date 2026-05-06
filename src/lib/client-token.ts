"use client";

const KEY = "qa_student_token_v1";

export function getClientToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return "fallback-token";
  }
}
