function tokens(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(cleaned);
}

/** Jaccard similarity on word tokens (0–1). */
export function similarityScore(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) {
    if (B.has(t)) inter++;
  }
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function similarQuestionCount(subject: QuestionBrief, others: QuestionBrief[], threshold = 0.28): number {
  const hay = `${subject.title}\n${subject.body}`;
  let n = 0;
  for (const o of others) {
    if (o.id === subject.id) continue;
    const combined = `${o.title}\n${o.body}`;
    if (similarityScore(hay, combined) >= threshold) n++;
  }
  return n;
}

type QuestionBrief = { id: string; title: string; body: string };
