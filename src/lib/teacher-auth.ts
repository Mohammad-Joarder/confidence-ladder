import { NextResponse } from "next/server";

export function teacherUnauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * MVP behavior:
 * - If TEACHER_SECRET is set, requests must provide it.
 * - If TEACHER_SECRET is missing, teacher APIs are open for easy local demos.
 */
export function assertTeacher(req: Request): NextResponse | null {
  const expected = process.env.TEACHER_SECRET;
  if (!expected) return null;

  const provided =
    req.headers.get("x-teacher-secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== expected) return teacherUnauthorized();
  return null;
}
