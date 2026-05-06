import { NextResponse } from "next/server";
import { rewriteQuestion } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { title?: string; body?: string };
    const title = (body.title ?? "").trim();
    const text = (body.body ?? "").trim();
    if (!title || !text) return NextResponse.json({ error: "title and body required" }, { status: 400 });

    const improved = await rewriteQuestion(title, text);
    return NextResponse.json(improved);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
