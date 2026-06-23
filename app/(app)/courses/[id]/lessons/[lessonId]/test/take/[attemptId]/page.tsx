import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { TestRunner } from "../_components/TestRunner"
import { AttemptResult } from "../_components/AttemptResult"

/** Deterministic seeded shuffle so a given attempt always sees the same order. */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const rand = () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string; attemptId: string }>
}) {
  const { id, lessonId, attemptId } = await params
  const session = await auth()
  if (!session) return null

  const userId = session.user.id

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      responses: true,
      test: {
        include: {
          lesson: { include: { course: true } },
          questions: { orderBy: { order: "asc" }, include: { answers: true } },
        },
      },
    },
  })

  if (
    !attempt ||
    attempt.userId !== userId ||
    attempt.test.lessonId !== lessonId ||
    attempt.test.lesson.courseId !== id
  ) {
    notFound()
  }

  const test = attempt.test
  const lesson = test.lesson

  // ── Finished → result screen (chunk 4) ──
  if (attempt.finishedAt) {
    const attemptsAllowed = 1 + test.maxRetries
    const finishedCount = await prisma.testAttempt.count({
      where: { testId: test.id, userId, finishedAt: { not: null } },
    })
    const anyPassed = await prisma.testAttempt.count({
      where: { testId: test.id, userId, passed: true },
    })
    const canRetry = anyPassed === 0 && finishedCount < attemptsAllowed && !attempt.passed

    return (
      <AttemptResult
        courseId={id}
        lessonId={lessonId}
        lessonName={lesson.name}
        canRetry={canRetry}
        score={attempt.score ?? 0}
        maxScore={attempt.maxScore ?? 0}
        passed={!!attempt.passed}
        minPassPercent={test.minPassPercent}
        questions={test.questions.map((q) => ({
          id: q.id,
          text: q.text,
          points: q.points,
          answers: q.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect })),
          selectedIds: attempt.responses.find((r) => r.questionId === q.id)?.selectedIds ?? [],
        }))}
      />
    )
  }

  // ── In progress → quiz UI (chunk 3) ──
  let questions = test.questions.map((q) => ({
    id: q.id,
    text: q.text,
    points: q.points,
    // Hint whether multiple selection is expected, without revealing which are correct.
    multiple: q.answers.filter((a) => a.isCorrect).length > 1,
    answers: q.answers.map((a) => ({ id: a.id, text: a.text })),
  }))

  if (test.randomOrder) {
    questions = seededShuffle(questions, attemptId)
    questions = questions.map((q) => ({ ...q, answers: seededShuffle(q.answers, attemptId + q.id) }))
  }

  return (
    <TestRunner
      courseId={id}
      lessonId={lessonId}
      lessonName={lesson.name}
      attemptId={attemptId}
      startedAt={attempt.startedAt.toISOString()}
      timeLimit={test.timeLimit}
      questions={questions}
    />
  )
}
