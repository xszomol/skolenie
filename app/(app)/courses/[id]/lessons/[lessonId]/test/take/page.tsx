import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  Clock,
  Target,
  RefreshCw,
  ListChecks,
  CheckCircle2,
  XCircle,
  PlayCircle,
  ChevronRight,
} from "lucide-react"
import { startAttempt } from "./actions"

function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  return `${m} min`
}

export default async function TestTakePage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>
}) {
  const { id, lessonId } = await params
  const session = await auth()
  if (!session) return null

  const userId = session.user.id
  const roles = session.user.roles ?? []

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      test: {
        include: {
          questions: { select: { points: true } },
          attempts: {
            where: { userId },
            orderBy: { startedAt: "desc" },
          },
        },
      },
      course: { include: { participants: true } },
    },
  })

  if (!lesson || lesson.courseId !== id || !lesson.test) notFound()

  const isParticipant =
    roles.includes("PARTICIPANT") && lesson.course.participants.some((p) => p.userId === userId)
  if (!isParticipant) notFound()

  const test = lesson.test
  const totalQuestions = test.questions.length
  const totalPoints = test.questions.reduce((s, q) => s + q.points, 0)
  const attemptsAllowed = 1 + test.maxRetries

  const finishedAttempts = test.attempts.filter((a) => a.finishedAt)
  const inProgress = test.attempts.find((a) => !a.finishedAt)
  const attemptsUsed = finishedAttempts.length
  const attemptsLeft = Math.max(0, attemptsAllowed - attemptsUsed)
  const hasPassed = finishedAttempts.some((a) => a.passed)
  const canStart = !hasPassed && attemptsLeft > 0 && totalQuestions > 0

  // Start (or resume) and jump straight into the attempt.
  async function start() {
    "use server"
    const { attemptId } = await startAttempt(lessonId)
    redirect(`/courses/${id}/lessons/${lessonId}/test/take/${attemptId}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <p className="text-sm text-muted-foreground">
        <Link href={`/courses/${id}`} className="hover:underline">
          {lesson.course.name}
        </Link>
        {" / "}
        {lesson.name}
        {" / Test"}
      </p>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Test — {lesson.name}</h1>
          {test.introText && (
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{test.introText}</p>
          )}
        </div>

        {/* Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={<ListChecks className="h-4 w-4" />} label="Otázok" value={`${totalQuestions}`} />
          <Stat icon={<Target className="h-4 w-4" />} label="Bodov" value={`${totalPoints}`} />
          <Stat
            icon={<Clock className="h-4 w-4" />}
            label="Čas"
            value={test.timeLimit ? fmtDuration(test.timeLimit) : "bez limitu"}
          />
          <Stat
            icon={<RefreshCw className="h-4 w-4" />}
            label="Zostáva pokusov"
            value={`${attemptsLeft} / ${attemptsAllowed}`}
          />
        </div>

        {test.minPassPercent != null && (
          <p className="text-sm text-muted-foreground">
            Na úspešné absolvovanie je potrebných aspoň{" "}
            <span className="font-medium text-foreground">{test.minPassPercent} %</span>.
          </p>
        )}

        {/* Status / actions */}
        {totalQuestions === 0 ? (
          <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
            Test zatiaľ neobsahuje žiadne otázky.
          </p>
        ) : hasPassed ? (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-300">
            Tento test ste už úspešne absolvovali. 🎉
          </div>
        ) : inProgress ? (
          <Link
            href={`/courses/${id}/lessons/${lessonId}/test/take/${inProgress.id}`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <PlayCircle className="h-4 w-4" />
            Pokračovať v rozpracovanom teste
          </Link>
        ) : canStart ? (
          <form action={start}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <PlayCircle className="h-4 w-4" />
              {attemptsUsed === 0 ? "Spustiť test" : "Skúsiť znova"}
            </button>
          </form>
        ) : (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-300">
            Vyčerpali ste všetky pokusy o tento test.
          </div>
        )}
      </div>

      {/* Attempt history */}
      {finishedAttempts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">História pokusov</h2>
          <div className="space-y-2">
            {finishedAttempts.map((a, i) => {
              const number = finishedAttempts.length - i
              const percent =
                a.maxScore && a.maxScore > 0 ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : 0
              const passed = a.passed
              return (
                <Link
                  key={a.id}
                  href={`/courses/${id}/lessons/${lessonId}/test/take/${a.id}`}
                  className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <span
                    className={
                      passed
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Pokus {number} — {a.score} / {a.maxScore} b ({percent} %)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.finishedAt && new Date(a.finishedAt).toLocaleString("sk")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      passed
                        ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                    }`}
                  >
                    {passed ? "Úspešný" : "Neúspešný"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  )
}
