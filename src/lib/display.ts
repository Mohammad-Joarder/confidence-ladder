import type { Poll, Question } from "./types";

/** Public-safe question (no voter fingerprints; anonymous posts hide display name). */
export function publicQuestion(q: Question) {
  const { upvoteFingerprints: _fp, ...rest } = q;
  if (!rest.anonymous) return rest;
  const { authorDisplay: _, ...out } = rest;
  return out;
}

export function publicPoll(p: Poll) {
  const { voterFingerprints: _v, ...rest } = p;
  return rest;
}
