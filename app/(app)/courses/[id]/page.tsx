import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { computeParticipantProgress } from "@/lib/progress"
import {
  inviteParticipant,
  inviteTrainer,
  removeParticipant,
  removeTrainer,
  setPrimaryTrainer,
} from "./actions"
import { CourseHeader } from "./_components/CourseHeader"
import { InviteForm } from "./_components/InviteForm"
import { SortableLessonList } from "./_components/SortableLessonList"

type ParticipantState = "not-started" | "in-progress" | "done"

type LessonDetail = {
  id: string
  name: string
  mandatory: boolean
  hasTest: boolean
  done: boolean
  testPassed: boolean | null
}

function participantState(percent: number, color: "green" | "orange" | "red" | null): ParticipantState {
  if (percent === 0) return "not-started"
  if (color !== null) return "done"
  return "in-progress"
}

const STATE_LABELS: Record<ParticipantState, string> = {
  "not-started": "Nezačatý",
  "in-progress": "Prebieha",
  "done":        "Dokončený",
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ filter?: string }>
}) {
  const [{ id }, { filter: filterParam }] = await Promise.all([params, searchParams])
  const activeFilter = (["not-started", "in-progress", "done"].includes(filterParam ?? "")
    ? filterParam
    : null) as ParticipantState | null

  const session = await auth()
  if (!session) return null

  const roles = session.user.roles ?? []
  const userId = session.user.id

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      primaryTrainer: true,
      trainers: { include: { user: true } },
      participants: { include: { user: true } },
      lessons: {
        orderBy: { order: "asc" },
        include: {
          test: true,
          _count: { select: { progress: { where: { completedAt: { not: null } } }, pages: true } },
        },
      },
    },
  })

  if (!course) notFound()

  const isAdmin = roles.includes("ADMIN")
  const isCourseTrainer =
    roles.includes("TRAINER") &&
    (course.primaryTrainerId === userId ||
      course.trainers.some((t) => t.userId === userId))
  const isParticipant =
    roles.includes("PARTICIPANT") &&
    course.participants.some((p) => p.userId === userId)
  const isPrimaryTrainer = course.primaryTrainerId === userId
  const canEdit = isAdmin || isCourseTrainer

  if (!isAdmin && !isCourseTrainer && !isParticipant) notFound()

  // Progress data for participant list
  let participantProgress: Array<{ userId: string; percent: number; color: "green" | "orange" | "red" | null; lessonDetails: LessonDetail[] }> = []

  if (canEdit && course.participants.length > 0) {
    const [allLessonProgress, allTestAttempts] = await Promise.all([
      prisma.lessonProgress.findMany({ where: { lesson: { courseId: id } } }),
      prisma.testAttempt.findMany({ where: { test: { lesson: { courseId: id } } } }),
    ])

    participantProgress = course.participants.map((p) => {
      const userLessonProgress = allLessonProgress.filter((lp) => lp.userId === p.userId)
      const userAttempts = allTestAttempts.filter((a) => a.userId === p.userId && a.finishedAt)
      const lessonDetails: LessonDetail[] = course.lessons.map((l) => {
        const done = userLessonProgress.some((lp) => lp.lessonId === l.id && lp.completedAt)
        let testPassed: boolean | null = null
        if (l.test) {
          const attempts = userAttempts.filter((a) => a.testId === l.test!.id)
          if (attempts.length > 0) testPassed = attempts.some((a) => a.passed === true)
        }
        return { id: l.id, name: l.name, mandatory: l.mandatory, hasTest: !!l.test, done, testPassed }
      })
      return {
        userId: p.userId,
        ...computeParticipantProgress(p.userId, course.lessons, allLessonProgress, allTestAttempts),
        lessonDetails,
      }
    })
  }

  // Test attempts + lesson progress of the current participant
  let myAttempts: Array<{ testId: string; score: number | null; maxScore: number | null; passed: boolean | null }> = []
  let myCompletedLessonIds: string[] = []
  let myCompletedPagesByLesson: Record<string, number> = {}
  if (isParticipant) {
    const [attempts, lessonProgress, pageProgress] = await Promise.all([
      prisma.testAttempt.findMany({
        where: { userId, test: { lesson: { courseId: id } }, finishedAt: { not: null } },
        select: { testId: true, score: true, maxScore: true, passed: true },
      }),
      prisma.lessonProgress.findMany({
        where: { userId, lesson: { courseId: id }, completedAt: { not: null } },
        select: { lessonId: true },
      }),
      prisma.lessonPageProgress.findMany({
        where: { userId, completedAt: { not: null }, page: { lesson: { courseId: id } } },
        select: { page: { select: { lessonId: true } } },
      }),
    ])
    myAttempts = attempts
    myCompletedLessonIds = lessonProgress.map((p) => p.lessonId)
    myCompletedPagesByLesson = pageProgress.reduce<Record<string, number>>((acc, p) => {
      acc[p.page.lessonId] = (acc[p.page.lessonId] ?? 0) + 1
      return acc
    }, {})
  }

  function participantTestStatus(test: { id: string; maxRetries: number }) {
    const attempts = myAttempts.filter((a) => a.testId === test.id)
    if (attempts.length === 0) {
      return { color: null as "green" | "orange" | "red" | null, label: "Nezačatý", cta: "Spustiť test" }
    }
    const passed = attempts.filter((a) => a.passed)
    if (passed.length > 0) {
      const best = passed.reduce((b, a) => ((a.score ?? 0) > (b.score ?? 0) ? a : b))
      const pct = best.maxScore ? Math.round(((best.score ?? 0) / best.maxScore) * 100) : 0
      return { color: "green" as const, label: `Úspešný · ${pct} %`, cta: "Zobraziť" }
    }
    const left = 1 + test.maxRetries - attempts.length
    return left > 0
      ? { color: "orange" as const, label: "Neúspešný", cta: "Skúsiť znova" }
      : { color: "red" as const, label: "Neúspešný", cta: "Zobraziť" }
  }

  const canDelete = canEdit && course.participants.filter((p) => p.confirmedAt).length === 0

  return (
    <div className="space-y-10">

      {/* ── Back link ── */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kurzy
      </Link>

      {/* ── Header ── */}
      <CourseHeader
        courseId={id}
        name={course.name}
        description={course.description}
        startDate={course.startDate.toISOString().split("T")[0]}
        endDate={course.endDate.toISOString().split("T")[0]}
        materialsAfterEnd={course.materialsAfterEnd}
        primaryTrainerName={`${course.primaryTrainer.firstName} ${course.primaryTrainer.lastName}`}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {/* ── Lessons ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Lekcie ({course.lessons.length})</h2>
          {canEdit && (
            <Link
              href={`/courses/${id}/lessons/new`}
              className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm hover:opacity-90 transition-opacity"
            >
              + Nová lekcia
            </Link>
          )}
        </div>

        {course.lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatiaľ žiadne lekcie.</p>
        ) : canEdit ? (
          <SortableLessonList
            lessons={course.lessons.map((l) => ({
              id: l.id,
              name: l.name,
              mandatory: l.mandatory,
              hasTest: !!l.test,
              completedCount: l._count.progress,
            }))}
            courseId={id}
            participantCount={course.participants.length}
          />
        ) : (
          <div className="border rounded-lg divide-y">
            {course.lessons.map((lesson) => {

              // Participant row → lesson viewer + test status/action.
              const status = lesson.test ? participantTestStatus(lesson.test) : null
              const lessonDone = myCompletedLessonIds.includes(lesson.id)
              const totalPages = lesson._count.pages
              const completedPages = myCompletedPagesByLesson[lesson.id] ?? 0
              const progressPct = totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : null
              const testPassed = status?.color === "green"

              // 4 visual states
              const lessonState =
                lessonDone && (!lesson.test || testPassed) ? "done"
                : lessonDone && lesson.test ? "test-pending"
                : completedPages > 0 ? "in-progress"
                : "not-started"

              const dotColor = {
                "done":         "bg-green-500",
                "test-pending": "bg-amber-400",
                "in-progress":  "bg-orange-400",
                "not-started":  "bg-muted-foreground/25",
              }[lessonState]

              return (
                <div key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotColor}`} />
                  <div className="flex flex-1 items-center justify-between gap-4 min-w-0">
                  <Link
                    href={`/courses/${id}/lessons/${lesson.id}/take`}
                    className="flex items-center gap-2 flex-wrap min-w-0 group"
                  >
                    <span className="text-sm font-medium group-hover:text-primary group-hover:underline transition-colors">
                      {lesson.name}
                    </span>
                    {!lesson.mandatory && (
                      <span className="text-xs border rounded px-1.5 py-0.5 text-muted-foreground">
                        voliteľná
                      </span>
                    )}
                    {lesson.test && (
                      <span className="text-xs border rounded px-1.5 py-0.5 text-muted-foreground">
                        test
                      </span>
                    )}
                  </Link>
                  <div className="flex items-center gap-3 shrink-0">
                    {progressPct !== null && (
                      <span className={`text-xs tabular-nums ${lessonState === "done" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {progressPct}&nbsp;%
                      </span>
                    )}
                    {status && lesson.test && (
                      <>
                        {status.color && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                status.color === "green"
                                  ? "bg-green-500"
                                  : status.color === "orange"
                                  ? "bg-orange-400"
                                  : "bg-red-500"
                              }`}
                            />
                            {status.label}
                          </span>
                        )}
                        <Link
                          href={`/courses/${id}/lessons/${lesson.id}/test/take`}
                          className="text-xs font-medium border rounded-md px-2.5 py-1 hover:bg-muted transition-colors"
                        >
                          {status.cta}
                        </Link>
                      </>
                    )}
                  </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Participants (trainer/admin only) ── */}
      {canEdit && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Účastníci ({course.participants.length})</h2>

          {course.participants.length > 0 && (() => {
            // Annotate each participant with their state
            const annotated = course.participants.map((p) => {
              const prog = participantProgress.find((pp) => pp.userId === p.userId)
              const percent = prog?.percent ?? 0
              const color = prog?.color ?? null
              return { p, percent, color, state: participantState(percent, color), lessonDetails: prog?.lessonDetails ?? [] }
            })

            const counts: Record<ParticipantState, number> = {
              "not-started": 0,
              "in-progress": 0,
              "done": 0,
            }
            for (const { state } of annotated) counts[state]++

            const visible = activeFilter
              ? annotated.filter((a) => a.state === activeFilter)
              : annotated

            return (
              <>
                {/* Summary + filter chips */}
                <div className="flex flex-wrap gap-2">
                  {(["not-started", "in-progress", "done"] as ParticipantState[]).map((s) => (
                    <Link
                      key={s}
                      href={activeFilter === s ? `/courses/${id}` : `/courses/${id}?filter=${s}`}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                        activeFilter === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${
                        s === "done"        ? "bg-green-500" :
                        s === "in-progress" ? "bg-orange-400" :
                                              "bg-muted-foreground/40"
                      }`} />
                      {STATE_LABELS[s]}
                      <span className={`ml-0.5 ${activeFilter === s ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                        {counts[s]}
                      </span>
                    </Link>
                  ))}
                </div>

                {/* Participant list */}
                <div className="border rounded-lg divide-y">
                  {visible.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                      Žiadni účastníci v tejto kategórii.
                    </p>
                  ) : visible.map(({ p, percent, color, state, lessonDetails }) => {
                    const removeAction = removeParticipant.bind(null, id, p.userId)
                    return (
                      <details key={p.userId} className="group">
                        <summary className="flex items-center justify-between px-4 py-3 gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              color === "green"  ? "bg-green-500" :
                              color === "orange" ? "bg-orange-400" :
                              color === "red"    ? "bg-red-500" :
                              state === "in-progress" ? "bg-orange-400/50" :
                                                  "bg-muted-foreground/30"
                            }`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {p.user.firstName} {p.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{p.user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm text-muted-foreground tabular-nums">{percent} %</span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground/60 transition-transform group-open:rotate-180" />
                          </div>
                        </summary>
                        <div className="px-4 pb-3 pt-2 space-y-1 border-t bg-muted/20">
                          {lessonDetails.map((l) => (
                            <div key={l.id} className="flex items-center gap-2 text-xs py-0.5">
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${l.done ? "bg-green-500" : "bg-muted-foreground/25"}`} />
                              <span className="flex-1 min-w-0 truncate text-muted-foreground">
                                {l.name}
                                {!l.mandatory && <span className="ml-1 opacity-60">(vol.)</span>}
                              </span>
                              {l.hasTest ? (
                                <span className={`shrink-0 ${
                                  l.testPassed === true  ? "text-green-600 dark:text-green-400" :
                                  l.testPassed === false ? "text-orange-500" :
                                                           "text-muted-foreground/40"
                                }`}>
                                  {l.testPassed === true ? "✓ test" : l.testPassed === false ? "✗ test" : "– test"}
                                </span>
                              ) : (
                                <span className={`shrink-0 ${l.done ? "text-green-600 dark:text-green-400" : "text-muted-foreground/30"}`}>
                                  {l.done ? "✓" : "–"}
                                </span>
                              )}
                            </div>
                          ))}
                          {!p.confirmedAt && (
                            <form action={removeAction} className="pt-1.5">
                              <button type="submit" className="text-xs text-destructive hover:underline">
                                Odobrať účastníka
                              </button>
                            </form>
                          )}
                        </div>
                      </details>
                    )
                  })}
                </div>
              </>
            )
          })()}

          <InviteForm
            action={inviteParticipant.bind(null, id)}
            placeholder="email@účastníka.sk"
            buttonLabel="Pozvať účastníka"
          />
        </section>
      )}

      {/* ── Trainers (trainer/admin only) ── */}
      {canEdit && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Školitelia</h2>

          {course.trainers.length > 1 && (
            <div className="border rounded-lg divide-y">
              {course.trainers.map((t) => {
                const isPrimary = t.userId === course.primaryTrainerId
                const setAsPrimaryAction = setPrimaryTrainer.bind(null, id, t.userId)
                const removeAction = removeTrainer.bind(null, id, t.userId)

                return (
                  <div key={t.userId} className="flex items-center justify-between px-4 py-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        {t.user.firstName} {t.user.lastName}
                        {isPrimary && (
                          <span className="ml-2 text-xs text-muted-foreground">(hlavný)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.user.email}</p>
                    </div>
                    {isPrimaryTrainer && !isPrimary && (
                      <div className="flex gap-4 shrink-0">
                        <form action={setAsPrimaryAction}>
                          <button type="submit" className="text-xs hover:underline">
                            Nastaviť ako hlavného
                          </button>
                        </form>
                        <form action={removeAction}>
                          <button type="submit" className="text-xs text-destructive hover:underline">
                            Odobrať
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <InviteForm
            action={inviteTrainer.bind(null, id)}
            placeholder="email@školiteľa.sk"
            buttonLabel="Pozvať školiteľa"
          />
        </section>
      )}

    </div>
  )
}
