import { NextResponse } from "next/server";
import { participationKey } from "@/lib/crypto-util";
import { bumpParticipation } from "@/lib/participation";
import { mutateStore } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      clientToken?: string;
      kind?: "page_view" | "set_nickname";
      nickname?: string;
    };

    const token = typeof body.clientToken === "string" ? body.clientToken : "";
    if (!token || token.length < 8) {
      return NextResponse.json({ error: "clientToken required" }, { status: 400 });
    }

    const key = participationKey(token);

    if (body.kind === "set_nickname") {
      const nickname = (body.nickname ?? "").trim();
      if (!nickname) return NextResponse.json({ error: "nickname required" }, { status: 400 });
      await mutateStore((draft) => {
        bumpParticipation(draft, key, { kind: "set_nickname", nickname });
      });
    } else {
      await mutateStore((draft) => {
        bumpParticipation(draft, key, { kind: "page_view" });
      });
    }

    const { loadStore } = await import("@/lib/store");
    const store = await loadStore();
    const rec = store.participation[key];
    return NextResponse.json({
      stage: rec?.stage ?? "anonymous",
      nickname: rec?.nickname,
      pageViews: rec?.pageViews ?? 0,
      questionsAsked: rec?.questionsAsked ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
