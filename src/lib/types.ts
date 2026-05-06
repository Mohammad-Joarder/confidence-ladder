export type ConfidenceStage = "anonymous" | "nickname" | "named";

export interface Question {
  id: string;
  title: string;
  body: string;
  anonymous: boolean;
  /** Only when anonymous is false */
  authorDisplay?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  upvoteFingerprints: string[];
  status: "pending" | "answered";
  markedLiveClarification: boolean;
  aiImprovedBody?: string;
}

export interface Answer {
  id: string;
  questionId: string;
  body: string;
  createdAt: string;
}

export interface DoubtSession {
  id: string;
  topic: string;
  startsAt: string;
  meetingUrl?: string;
  createdAt: string;
}

export interface PollOption {
  id: string;
  label: string;
  count: number;
}

export interface Poll {
  id: string;
  prompt: string;
  options: PollOption[];
  createdAt: string;
  voterFingerprints: string[];
}

export interface ParticipationEvent {
  kind: "page_view" | "question_asked" | "upvote" | "poll_vote" | "nickname_set";
  at: string;
}

export interface ParticipationRecord {
  stage: ConfidenceStage;
  nickname?: string;
  pageViews: number;
  questionsAsked: number;
  upvotesGiven: number;
  pollVotes: number;
  lastViewAt?: string;
  lastNudgeAt?: string;
  updatedAt: string;
  recentEvents: ParticipationEvent[];
}

export interface AppData {
  questions: Question[];
  answers: Answer[];
  sessions: DoubtSession[];
  polls: Poll[];
  participation: Record<string, ParticipationRecord>;
}

export function emptyStore(): AppData {
  return {
    questions: [],
    answers: [],
    sessions: [],
    polls: [],
    participation: {},
  };
}
