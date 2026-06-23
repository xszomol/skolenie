# Skolenie LMS — Project Context

## What This App Is

An invitation-based Learning Management System (LMS) in Slovak. Three user roles manage and consume structured courses built from slide-style lessons and multiple-choice tests.

## User Roles

| Role | Slovak | Key capabilities |
|------|--------|-----------------|
| Admin | Admin | Sees all courses, manages trainers, views all users |
| Trainer | Školiteľ | Creates/manages courses and lessons, invites participants |
| Participant | Účastník | Reads lessons, takes tests, tracks own progress |

A single user account can hold multiple roles. The UI shows a separate section per role on the course list page.

## Core Domain Concepts

**Course** — has name, description, start/end date, flag for post-course material access, one *primary trainer*, zero or more additional trainers, zero or more participants.

**Lesson** — belongs to a course; has name, mandatory/optional flag, per-page minimum time (default 30 s). Pages uploaded as PDF or PPT (converted server-side via LibreOffice + python-pptx). Page order is reorderable.

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
| PDF/PPT conversion | LibreOffice headless + python-pptx (system deps, not npm) | MPL-2.0 / LGPL |
| Email | Nodemailer + SMTP | MIT |
| Client data fetching | TanStack Query v5 | MIT |

## Project Structure

```
skolenie/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx                        — email+password login
│   │   ├── register/page.tsx                     — invite-token registration + role merge
│   │   ├── forgot-password/page.tsx              — request password reset email
│   │   ├── reset-password/page.tsx               — set new password via token
│   │   └── confirm-password-change/page.tsx      — confirm change via emailed link
│   ├── (app)/
│   │   ├── layout.tsx                            — nav bar (logo, Users link for admin, theme toggle, profile, logout)
│   │   ├── admin/users/page.tsx                  — admin-only: list all users + roles
│   │   ├── profile/
│   │   │   ├── page.tsx                          — edit name; change password (sends confirmation email)
│   │   │   ├── actions.ts
│   │   │   └── _components/{ProfileForm,PasswordForm}.tsx
│   │   └── courses/
│   │       ├── page.tsx                          — course list with filters (role, status, search)
│   │       ├── _components/CourseFilters.tsx     — client-side filter bar
│   │       ├── new/page.tsx + actions.ts         — create course form
│   │       └── [id]/
│   │           ├── page.tsx                      — course detail (header, lessons, participants, trainers)
│   │           ├── actions.ts                    — invite/remove trainer & participant, set primary trainer
│   │           ├── edit/page.tsx                 — edit course metadata
│   │           ├── _components/
│   │           │   ├── CourseHeader.tsx          — title, dates, status badge, edit/delete buttons
│   │           │   ├── InviteForm.tsx            — invite trainer or participant by email
│   │           │   └── DeleteCourseButton.tsx
│   │           └── lessons/
│   │               ├── new/page.tsx + actions.ts — create lesson form
│   │               └── [lessonId]/
│   │                   ├── page.tsx              — lesson detail (pages list, upload, test link)
│   │                   ├── actions.ts
│   │                   ├── _components/
│   │                   │   ├── LessonPages.tsx   — page list with preview images
│   │                   │   ├── UploadForm.tsx    — PDF/PPT upload, triggers conversion
│   │                   │   └── DeleteLessonButton.tsx
│   │                   ├── take/
│   │                   │   ├── page.tsx          — participant lesson viewer entry point
│   │                   │   ├── actions.ts        — record page progress (time spent)
│   │                   │   └── _components/LessonViewer.tsx  — page-by-page viewer, min-time enforcement
│   │                   └── test/
│   │                       ├── page.tsx          — test overview (trainer view + participant attempt history)
│   │                       ├── actions.ts
│   │                       ├── _components/TestBuilder.tsx   — create/edit test, questions, answers
│   │                       └── take/
│   │                           ├── page.tsx      — start attempt or resume
│   │                           ├── actions.ts    — start/submit attempt, grade answers
│   │                           ├── [attemptId]/page.tsx      — attempt result detail
│   │                           └── _components/
│   │                               ├── TestRunner.tsx        — timed quiz UI
│   │                               └── AttemptResult.tsx     — score, pass/fail, per-question breakdown
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── invitations/route.ts         — POST: create invitation + send email
│   │   ├── files/[...path]/route.ts     — proxy signed MinIO URLs to the browser
│   │   └── lessons/[lessonId]/upload/route.ts  — receive PDF/PPT, convert, store pages
│   ├── globals.css
│   ├── layout.tsx                       — root layout: Inter font, theme script, Providers
│   ├── page.tsx                         — redirects → /courses
│   └── providers.tsx                    — SessionProvider + QueryClientProvider
├── components/
│   └── ThemeToggle.tsx                  — dark/light mode toggle (persists to localStorage)
├── lib/
│   ├── db.ts                            — Prisma client singleton
│   ├── email.ts                         — sendInvitationEmail, sendPasswordResetEmail, sendPasswordChangeConfirmationEmail
│   ├── storage.ts                       — MinIO uploadFile() / getSignedUrl()
│   ├── convert.ts                       — PDF/PPT → images via LibreOffice + python-pptx; uploads pages to MinIO
│   ├── invitations.ts                   — createInvitation() business logic
│   ├── grading.ts                       — pure grading helpers (score, pass/fail)
│   ├── progress.ts                      — computeParticipantProgress() for course detail view
│   └── utils.ts                         — cn() Tailwind helper
├── prisma/
│   └── schema.prisma                    — full data model (see Database Schema section)
├── types/
│   └── next-auth.d.ts                   — extends Session with id + roles[]
├── auth.ts                              — NextAuth v5 config (JWT strategy, unstable_update exported)
├── middleware.ts                        — auth guard; excludes login, register, forgot/reset-password, confirm-password-change, _next/static
├── Dockerfile                           — two-stage build (builder + runner); entrypoint runs prisma db push
├── entrypoint.sh                        — prisma db push --skip-generate, then next start
├── docker-compose.yml                   — local dev: postgres + minio + mailhog
├── docker-compose.prod.yml              — production: app + caddy + postgres + minio (no exposed internal ports)
├── Caddyfile                            — auto-TLS via Let's Encrypt; routes APP_DOMAIN → app, MINIO_DOMAIN → minio
├── .env.example                         — local dev env template
└── .env.production.example              — production env template
```

## Database Schema (key models)

- `User` — email, firstName, lastName, passwordHash
- `UserRole` — composite PK (userId, role); a user can hold ADMIN, TRAINER, PARTICIPANT simultaneously
- `Invitation` — token, role, optional courseId, expiresAt, usedAt
- `PasswordResetToken` — token, userId, expiresAt, usedAt (for forgot-password flow)
- `PendingPasswordChange` — token, userId, newPasswordHash, expiresAt, usedAt (for email-confirmed password change from profile)
- `Course` — name, description, dates, materialsAfterEnd, primaryTrainerId
- `CourseTrainer` / `CourseParticipant` — join tables (CourseParticipant has confirmedAt)
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
npx prisma db push
npm run db:seed
npm run dev                   # http://localhost:3000
```

Mailhog web UI: http://localhost:8025  
MinIO console: http://localhost:9001 (minioadmin / minioadmin)

**PDF/PPT conversion** (only needed if testing file uploads locally):
```bash
sudo apt install libreoffice
pip3 install python-pptx
```

## Production Deployment

Single-server Docker Compose on a VPS (e.g. Hetzner CX22, ~€4/month):

```bash
# On the VPS (Ubuntu 24.04):
curl -fsSL https://get.docker.com | sh
git clone <repo> && cd skolenie
cp .env.production.example .env.production
# Fill in .env.production (domains, passwords, SMTP, AUTH_SECRET)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Caddy fetches TLS certificates automatically. The entrypoint applies `prisma db push` on every boot (no-op if schema is already in sync).

**Note:** The production Dockerfile does not yet install LibreOffice or python-pptx. Lesson file uploads will fail in production until these system dependencies are added to the runner stage.

## What Is Still TODO

- Mobile layout polish

## Architecture Notes

- All technologies must be free and open source (no SaaS dependencies).
- Auth uses JWT session strategy (not database sessions); `unstable_update` is exported from `auth.ts` for session refresh after profile edits.
- `LessonPage.content` is a JSON array of typed blocks — block schema lives in `lib/convert.ts` (`PageResult`). Extend to `types/content.ts` if a rich editor is added.
- Test timer is purely client-side (`TestRunner.tsx`): `startedAt` is recorded server-side on attempt creation; deadline enforced on submission.
- MinIO bucket is created lazily on first upload (`ensureBucket()` in `lib/storage.ts`).
- Signed MinIO URLs are generated by the client SDK using `MINIO_ENDPOINT` — in production this must be the public hostname so browsers can fetch files.
- Password changes from the profile page go through an email confirmation loop (`PendingPasswordChange`). Password resets from the login page use a simpler direct-reset flow (`PasswordResetToken`).

## Test Accounts (local dev seed)

Run `npm run db:seed` to create these accounts.

| Email | Heslo | Rola |
|-------|-------|------|
| admin@skolenie.local | admin123 | Admin + Školiteľ |
| trainer@skolenie.local | trainer123 | Školiteľ |
| jan.novak@skolenie.local | heslo123 | Účastník |
| maria.kovac@skolenie.local | heslo123 | Účastník |
| peter.horvath@skolenie.local | heslo123 | Účastník |

Seed vytvorí 3 testovacie kurzy:
- **Základy Goju-Ryu karate** — prebiehajúci (jún–aug 2026), 3 lekcie, 2 testy
- **Bezpečnosť a ochrana zdravia pri práci** — plánovaný (aug 2026), 2 lekcie, 1 test
- **Základy prvej pomoci** — ukončený (mar 2026), 2 lekcie, 2 testy

## Out of Scope (for now)

- In-app PPT/PDF page authoring (upload-only; conversion is already implemented).
- Rich content editing beyond title/text/media per page.
