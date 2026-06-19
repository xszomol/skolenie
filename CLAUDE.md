# Skolenie LMS — Project Context

## What This App Is

An invitation-based Learning Management System (LMS) in Slovak. Three user roles manage and consume structured courses built from slide-style lessons and multiple-choice tests.

## User Roles

| Role | Slovak | Key capabilities |
|------|--------|-----------------|
| Admin | Admin | Sees all courses, manages trainers, can create courses |
| Trainer | Školiteľ | Creates/manages courses and lessons, invites participants |
| Participant | Účastník | Reads lessons, takes tests, tracks own progress |

A single user account can hold multiple roles. The UI shows a separate section per role on the course list page.

## Core Domain Concepts

**Course** — has name, description, start/end date, flag for post-course material access, one *primary trainer*, zero or more additional trainers, zero or more participants.

**Lesson** — belongs to a course; has name, mandatory/optional flag, per-page minimum time (default 30 s). Pages uploaded as PDF or PPT (converted server-side). Pages can contain text, images, video, or audio. Page order is reorderable.

**Test** — optional, attached to a lesson. Has: intro text, total time limit, minimum pass %, retry limit, random question order flag. Questions have arbitrary answer choices, one or more correct answers, and a point value (default 1).

**Progress** — tracked per participant per lesson page (time spent, `LessonPageProgress`) and per test attempt (`TestAttempt`, score, pass/fail, retries remaining).

## Key Business Rules

- Registration is invitation-only via email link.
- Invitation to an existing user adds the new role; same-role invitation lets them log in to existing account.
- Course deletion only allowed if zero participants have confirmed attendance.
- Lesson deletion only allowed if no participant has completed it.
- Trainer who creates a course becomes primary trainer automatically.
- Admin who creates a course is set as primary trainer if they also hold the Trainer role, otherwise must pick one.
- Participant must spend the configured minimum time on each page before advancing.
- Test score colours: green = passed, orange = failed but retries remain, red = failed and no retries left.
- Post-course material access controlled per course (`materialsAfterEnd`).
- Only the primary trainer can remove other trainers from a course.

## Tech Stack (all FOSS)

| Layer | Technology | License |
|-------|-----------|---------|
| Frontend + API | Next.js 15 (App Router) + TypeScript | MIT |
| UI | Tailwind CSS + shadcn/ui (Radix primitives) | MIT |
| Database | PostgreSQL 16 | PostgreSQL License |
| ORM | Prisma 5 | Apache 2.0 |
| Auth | NextAuth.js v5 (beta) | ISC |
| File storage | MinIO (self-hosted, S3-compatible) | AGPL-3.0 |
| PDF/PPT conversion | LibreOffice headless + pdf2pic | MPL-2.0 / MIT |
| Email | Nodemailer + SMTP | MIT |
| Client data fetching | TanStack Query v5 | MIT |

## Project Structure

```
skolenie/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          — email+password login (server action)
│   │   └── register/page.tsx       — invite-token registration + role merge
│   ├── (app)/
│   │   ├── layout.tsx              — nav bar + session auth guard
│   │   └── courses/
│   │       ├── page.tsx            — course list, one section per role
│   │       ├── new/                — create course form (TODO)
│   │       └── [id]/               — course detail + lesson/participant lists (TODO)
│   ├── api/auth/[...nextauth]/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                    — redirects → /courses
│   └── providers.tsx               — SessionProvider + QueryClientProvider
├── lib/
│   ├── db.ts                       — Prisma client singleton
│   ├── email.ts                    — Nodemailer sendInvitationEmail()
│   ├── storage.ts                  — MinIO uploadFile() / getSignedUrl()
│   └── utils.ts                    — cn() Tailwind helper
├── prisma/
│   └── schema.prisma               — full data model (see Database Schema)
├── types/
│   └── next-auth.d.ts              — extends Session with id + roles[]
├── auth.ts                         — NextAuth v5 config (JWT strategy)
├── middleware.ts                   — protects all routes except /login /register
├── docker-compose.yml              — postgres + minio + mailhog
└── .env.example
```

## Database Schema (key models)

- `User` — email, firstName, lastName, passwordHash
- `UserRole` — composite PK (userId, role); a user can hold ADMIN, TRAINER, PARTICIPANT simultaneously
- `Invitation` — token, role, optional courseId, expiresAt, usedAt
- `Course` — name, description, dates, materialsAfterEnd, primaryTrainerId
- `CourseTrainer` / `CourseParticipant` — join tables
- `Lesson` — mandatory, minPageTime (seconds), order
- `LessonPage` — order, title, content (JSON array of blocks)
- `Test` — timeLimit (seconds), minPassPercent, maxRetries, randomOrder
- `Question` — text, points, order
- `Answer` — text, isCorrect
- `TestAttempt` — startedAt, finishedAt, score, maxScore, passed
- `QuestionResponse` — selectedIds (String[], answer IDs chosen)
- `LessonPageProgress` — timeSpent (seconds), completedAt
- `LessonProgress` — completedAt

## Local Dev Setup

```bash
cp .env.example .env
docker compose up -d          # postgres :5432, minio :9000/:9001, mailhog :1025/:8025
npm install
npx prisma migrate dev --name init
npm run dev                   # http://localhost:3000
```

Mailhog web UI: http://localhost:8025  
MinIO console: http://localhost:9001 (minioadmin / minioadmin)

## What Is Still TODO

- `app/(app)/courses/new/` — create course form
- `app/(app)/courses/[id]/` — course detail (trainer view: edit params, manage lessons/participants/trainers)
- `app/(app)/courses/[id]/` — course detail (participant view: progress, lesson list)
- `app/(app)/courses/[id]/lessons/new/` — lesson creation + page editor
- `app/(app)/courses/[id]/lessons/[lessonId]/` — lesson page editor (trainer)
- `app/(app)/courses/[id]/lessons/[lessonId]/take/` — slide-by-slide lesson viewer (participant, timer)
- `app/(app)/courses/[id]/lessons/[lessonId]/test/` — test builder (trainer)
- `app/(app)/courses/[id]/lessons/[lessonId]/test/take/` — test taking with countdown (participant)
- API routes for invitations (`POST /api/invitations`)
- PDF/PPT upload + LibreOffice conversion pipeline
- Progress calculation helpers

## Architecture Notes

- All technologies must be free and open source (no SaaS dependencies).
- Auth uses JWT session strategy (not database sessions) so `PrismaAdapter` is only used for the adapter reference; actual session state lives in the JWT cookie.
- `LessonPage.content` is a JSON array of typed blocks — keep the block schema in a shared `types/content.ts` when implementing the editor.
- Test timer is purely client-side: record `startedAt` server-side on attempt creation, enforce deadline on submission.
- MinIO bucket is created lazily on first upload (`ensureBucket()` in `lib/storage.ts`).

## Out of Scope (for now)

- In-app PPT/PDF page authoring (upload-only).
- Rich content editing beyond title/text/media per page.
