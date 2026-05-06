import type { AppData, ParticipationRecord } from "./types";

const MAX_EVENTS = 14;

function ensureRecord(draft: AppData, key: string): ParticipationRecord {
  if (!draft.participation[key]) {
    const now = new Date().toISOString();
    draft.participation[key] = {
      stage: "anonymous",
      pageViews: 0,
      questionsAsked: 0,
      upvotesGiven: 0,
      pollVotes: 0,
      updatedAt: now,
      recentEvents: [],
    };
  }
  return draft.participation[key];
}

function pushEvent(rec: ParticipationRecord, kind: ParticipationRecord["recentEvents"][number]["kind"]) {
  rec.recentEvents = [{ kind, at: new Date().toISOString() }, ...rec.recentEvents].slice(0, MAX_EVENTS);
}

export type ParticipationAction =
  | { kind: "page_view" }
  | { kind: "question_asked"; anonymous: boolean }
  | { kind: "upvote" }
  | { kind: "poll_vote" }
  | { kind: "set_nickname"; nickname: string };

export function bumpParticipation(draft: AppData, key: string, action: ParticipationAction) {
  const rec = ensureRecord(draft, key);
  const now = new Date().toISOString();
  rec.updatedAt = now;

  switch (action.kind) {
    case "page_view":
      rec.pageViews += 1;
      rec.lastViewAt = now;
      pushEvent(rec, "page_view");
      break;
    case "question_asked":
      rec.questionsAsked += 1;
      pushEvent(rec, "question_asked");
      if (!action.anonymous) rec.stage = "named";
      else if (rec.nickname && rec.stage !== "named") rec.stage = "nickname";
      break;
    case "upvote":
      rec.upvotesGiven += 1;
      pushEvent(rec, "upvote");
      break;
    case "poll_vote":
      rec.pollVotes += 1;
      pushEvent(rec, "poll_vote");
      break;
    case "set_nickname": {
      rec.nickname = action.nickname.trim().slice(0, 48);
      if (rec.stage !== "named") rec.stage = "nickname";
      pushEvent(rec, "nickname_set");
      break;
    }
    default:
      break;
  }
}
