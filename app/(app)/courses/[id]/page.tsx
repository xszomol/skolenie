import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { computeParticipantProgress } from "@/lib/progress"
import {
  inviteParticipant,
  inviteTrainer,
  removeParticipant,
  removeTrainer,
  setPrimaryTrainer,
} from "./actions"
import { DeleteCourseButton } from "./_components/DeleteCourseButton"

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
          _count: { select: { progress: { where: { completedAt: { not: null } } } } },
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
  let participantProgress: Array<{ userId: string; percent: number; color: "green" | "orange" | "red" | null }> = []

  if (canEdit && course.participants.length > 0) {
    const [allLessonProgress, allTestAttempts] = await Promise.all([
      prisma.lessonProgress.findMany({ where: { lesson: { courseId: id } } }),
      prisma.testAttempt.findMany({ where: { test: { lesson: { courseId: id } } } }),
    ])

    participantProgress = course.participants.map((p) => ({
      userId: p.userId,
      ...computeParticipantProgress(p.userId, course.lessons, allLessonProgress, allTestAttempts),
    }))
  }

  const canDelete = canEdit && course.participants.filter((p) => p.confirmedAt).length === 0

  return (
    <div className="space-y-10">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{course.name}</h1>
          <p className="text-muted-foreground">{course.description}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(course.startDate).toLocaleDateString("sk")} –{" "}
            {new Date(course.endDate).toLocaleDateString("sk")}
            {course.materialsAfterEnd && " · Materiály dostupné po skončení"}
          </p>
          <p className="text-sm text-muted-foreground">
            Hlavný školiteľ: {course.primaryTrainer.firstName} {course.primaryTrainer.lastName}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/courses/${id}/edit`}
              className="border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              Upraviť
            </Link>
            {canDelete && <DeleteCourseButton courseId={id} />}
          </div>
        )}
      </div>

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
        ) : (
          <div className="border rounded-lg divide-y">
            {course.lessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={`/courses/${id}/lessons/${lesson.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{lesson.name}</span>
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
                </div>
                {canEdit && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {lesson._count.progress}/{course.participants.length} dokončili
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Participants (trainer/admin only) ── */}
      {canEdit && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Účastníci ({course.participants.length})</h2>

          {course.participants.length > 0 && (
            <div className="border rounded-lg divide-y">
              {course.participants.map((p) => {
                const progress = participantProgress.find((pp) => pp.userId === p.userId)
                const removeAction = removeParticipant.bind(null, id, p.userId)

                return (
                  <div key={p.userId} className="flex items-center justify-between px-4 py-3 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          progress?.color === "green"
                            ? "bg-green-500"
                            : progress?.color === "orange"
                            ? "bg-orange-400"
                            : progress?.color === "red"
                            ? "bg-red-500"
                            : "bg-muted-foreground/30"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {p.user.firstName} {p.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{p.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-sm text-muted-foreground w-10 text-right">
                        {progress?.percent ?? 0} %
                      </span>
                      {!p.confirmedAt && (
                        <form action={removeAction}>
                          <button type="submit" className="text-xs text-destructive hover:underline">
                            Odobrať
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <form action={inviteParticipant.bind(null, id)} className="flex gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="email@účastníka.sk"
              className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
            />
            <button
              type="submit"
              className="border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors shrink-0"
            >
              Pozvať účastníka
            </button>
          </form>
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

          <form action={inviteTrainer.bind(null, id)} className="flex gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="email@školiteľa.sk"
              className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
            />
            <button
              type="submit"
              className="border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors shrink-0"
            >
              Pozvať školiteľa
            </button>
          </form>
        </section>
      )}

      {/* ── Participant view placeholder ── */}
      {isParticipant && !canEdit && (
        <p className="text-sm text-muted-foreground italic">Pohľad účastníka — v príprave...</p>
      )}
    </div>
  )
}
