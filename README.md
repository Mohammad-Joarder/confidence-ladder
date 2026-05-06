# QuietBoard — low-cost student Q&A MVP

Anonymous-first question board with teacher workflow, doubt sessions, lightweight polls, chat assistant with similarity-backed FAQ hints, confidence ladder tracking (privacy-preserving), and automatic **30-day** retention cleanup.

## Architecture

```
Students / Teachers
       │
       ▼
 Next.js App Router
   ├── UI routes (/ , /ask, /q/[id], /sessions, /poll/[id], /teacher)
   ├── REST-ish JSON APIs (/api/...)
   └── Cron-triggered cleanup (/api/cron/cleanup)

Persistence (single JSON file — no blob/database SDK)
   └── Default: `data/store.json` next to the app (override with env `STORE_JSON_PATH`)

Serverless note: platforms like Netlify/Vercel lambdas often **cannot persist** this file across requests/deploys. Run **`npm run start`** (or Docker) on a host with a **writable disk** or mounted volume for production.

## File layout

```
src/
  app/
    page.tsx                 # Board
    ask/page.tsx             # Ask flow (minimal clicks)
    q/[id]/page.tsx          # Question + answers + similar list
    sessions/page.tsx        # Scheduled doubt sessions
    poll/[id]/page.tsx       # Anonymous poll vote UI
    teacher/page.tsx         # Teacher tools (secret-gated in-browser)
    api/
      questions/…            # CR questions + GET board payloads
      questions/[id]/answers POST teacher answer
      questions/[id]/upvote POST lightweight voting
      sessions/, polls/, polls/[id]/vote
      participation POST views / nickname (confidence ladder)
      nudge GET passive-user banner payload
      chat POST assistant + similarity-ranked FAQ excerpts
      ai/rewrite POST clarity rewrite (optional OpenAI)
      cron/cleanup GET (cron secret header)
  components/AppShell.tsx, ChatAssistant.tsx
  lib/
    types.ts, store.ts, display.ts
    similarity.ts, ai.ts, participation.ts
    retention.ts, teacher-auth.ts, crypto-util.ts
data/store.json              # Dev seed / git-safe empty schema
vercel.json                  # Cron schedule
```

## API sketch

| Method & path | Who | Purpose |
|---------------|-----|---------|
| GET `/api/questions` | Public | Board payload (+ similarity counts) |
| POST `/api/questions` | Public | Create question (`anonymous`, tags, optional AI improve, optional `clientToken`) |
| GET `/api/questions/[id]` | Public | Detail + answers + similar IDs |
| POST `/api/questions/[id]/upvote` | Public | Idempotent upvote (`clientToken`) |
| PATCH `/api/questions/[id]` | Teacher secret | Toggle live clarification flag |
| POST `/api/questions/[id]/answers` | Teacher secret | Post answer → marks answered |
| GET/POST `/api/sessions` | GET public / POST teacher | Doubt sessions |
| GET/POST `/api/polls` | GET public / POST teacher | Polls |
| POST `/api/polls/[id]/vote` | Public | Anonymous vote fingerprint |
| POST `/api/participation` | Public | Page views / nickname / ladder bumps |
| GET `/api/nudge` | Public | Passive-reader heuristic |
| POST `/api/chat` | Public | Assistant (+ optional OpenAI) |
| POST `/api/ai/rewrite` | Public | Pre-submit clarity rewrite |
| GET `/api/cron/cleanup` | Cron (`Bearer CRON_SECRET`) | Deletes entities older than 30 days |

Teacher authorization header: `x-teacher-secret: $TEACHER_SECRET`.

## JSON schema (`store.json` aggregate)

```json
{
  "questions": [
    {
      "id": "uuid",
      "title": "string",
      "body": "string",
      "anonymous": true,
      "authorDisplay": "optional when anonymous=false",
      "tags": ["string"],
      "createdAt": "ISO",
      "updatedAt": "ISO",
      "upvotes": 0,
      "upvoteFingerprints": [],
      "status": "pending|answered",
      "markedLiveClarification": false,
      "aiImprovedBody": "optional"
    }
  ],
  "answers": [{ "id", "questionId", "body", "createdAt" }],
  "sessions": [{ "id", "topic", "startsAt", "meetingUrl?", "createdAt" }],
  "polls": [{ "id", "prompt", "options": [{ "id", "label", "count" }], "createdAt", "voterFingerprints": [] }],
  "participation": {
    "sha256-key": {
      "stage": "anonymous|nickname|named",
      "nickname": "optional",
      "pageViews": 0,
      "questionsAsked": 0,
      "upvotesGiven": 0,
      "pollVotes": 0,
      "lastViewAt": "ISO?",
      "lastNudgeAt": "ISO?",
      "updatedAt": "ISO",
      "recentEvents": [{ "kind", "at" }]
    }
  }
}
```

## Wireframes (text)

```
Board                Ask                         Question detail
┌─────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│ Ask [btn]       │  │ Title [__________]     │  │ Status · Anonymous    │
│ [card] pending  │  │ Body  [textarea]       │  │ Title                 │
│ tags · ↑3 · sim │  │ [x] anonymous          │  │ Body                  │
└─────────────────┘  │ Tags … AI clarify [x]  │  │ [Upvote]              │
                     │ [ Preview ] [ Post ]   │  │ Answers list…          │
                     └────────────────────────┘  │ Similar threads        │
                                                 └────────────────────────┘
Teacher drawer                     Floating Assistant (all pages)
┌─────────────────────────────┐    ┌─────────────────────┐
│ Secret → Answer → Sessions │    │ Ladder stage badge   │
│ Poll creator → share link  │    │ Chat + nickname save │
└─────────────────────────────┘    └─────────────────────┘
```

## Implementation timeline (1–2 weeks)

1. **Day 1–2**: Scaffold Next.js, `store.json`, CR questions/board UI.
2. **Day 3**: Teacher secret routes + answers + live flags + similarity counts.
3. **Day 4**: Sessions + polls + retention cron branch logic locally.
4. **Day 5**: Participation ladder + nudge + floating assistant + `/api/chat`.
5. **Day 6**: Deploy to a Node host with persistent disk + cron secret wiring + smoke QA mobile.
6. **Week 2 (nice-to-have)**: Teacher UX polish (pick question from board without copying IDs), rate limiting headers, optimistic concurrency on Blob uploads (`ifMatch`).

## Deploy (persistent JSON file)

Use any Node host where **`data/store.json` stays writable** (VPS, Railway/Fly/Render with disk, Docker volume). Flow:

1. `npm install` → `npm run build` → `npm run start` (set `PORT` if needed).
2. **Environment variables**: `.env.example` (`TEACHER_SECRET`, `DATA_SECRET`, `CRON_SECRET`, optional OpenAI).
3. Optionally **`STORE_JSON_PATH`** if you must put the file somewhere else (e.g. `/tmp/...` on restrictive serverless — data may not survive restarts).
4. **Cron**: hit `GET /api/cron/cleanup` with header `Authorization: Bearer CRON_SECRET` on a schedule (see `vercel.json` for an example schedule if you use Vercel Cron).

Local development:

```bash
cd confidence-ladder
npm install
npm run dev
```

Data persists under `data/store.json` by default.

---

Privacy notes:

- Anonymous questions never persist browser identifiers server-side.
- Participation hashes (`DATA_SECRET`) are orthogonal — cannot reconcile anonymous posts with participation rows without guessing secrets/tokens.
- Poll/upvote fingerprints are opaque hashed pins scoped per-item.
