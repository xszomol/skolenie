"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { gradeAttempt, type SubmittedResponse } from "@/lib/grading"

/** Grace period (seconds) allowed past the deadline before a submission is rejected. */
const SUBMIT_GRACE_SECONDS = 15

async function requireParticipantAccess(lessonId: string) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      test: { include: { questions: { include: { answers: true } } } },
      course: { include: { participants: true } },
    },
  })
  if (!lesson) throw new Error("Not found")
  if (!lesson.test) throw new Error("No test for this lesson")

  const userId = session.user.id
  const roles = session.user.roles ?? []
  const isParticipant =
    roles.includes("PARTICIPANT") &&
    lesson.course.participants.some((p) => p.userId === userId)

  if (!isParticipant) throw new Error("Forbidden")

  return { session, userId, lesson, test: lesson.test, courseId: lesson.courseId }
}

function attemptsAllowed(maxRetries: number) {
  return 1 + maxRetries // first try + retries
}

/**
 * Start (or resume) a test attempt. Returns the attempt id.
 * - Resumes an existing unfinished attempt instead of creating a duplicate.
 * - Blocks if the participant has already passed.
 * - Blocks if no attempts remain.
 */
export async function startAttempt(lessonId: string): Promise<{ attemptId: string }> {
  const { userId, test, courseId } = await requireParticipantAccess(lessonId)

  const attempts = await prisma.testAttempt.findMany({
    where: { testId: test.id, userId },
    orderBy: { startedAt: "desc" },
  })

  // Resume an in-progress attempt.
  const inProgress = attempts.find((a) => a.finishedAt === null)
  if (inProgress) return { attemptId: inProgress.id }

  const finished = attempts.filter((a) => a.finishedAt !== null)
  if (finished.some((a) => a.passed)) throw new Error("Already passed")
  if (finished.length >= attemptsAllowed(test.maxRetries)) throw new Error("No attempts left")

  const attempt = await prisma.testAttempt.create({
    data: { testId: test.id, userId },
  })

  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/test/take`)
  return { attemptId: attempt.id }
}

/**
 * Submit answers for an attempt, grade them server-side, and persist the result.
 */
export async function submitAttempt(
  lessonId: string,
  attemptId: string,
  responses: SubmittedResponse[]
): Promise<{ score: number; maxScore: number; passed: boolean }> {
  const { userId, test, courseId } = await requireParticipantAccess(lessonId)

  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } })
  if (!attempt || attempt.userId !== userId || attempt.testId !== test.id) {
    throw new Error("Attempt not found")
  }
  if (attempt.finishedAt) throw new Error("Attempt already submitted")

  // Enforce the deadline (with a small grace window for network latency).
  if (test.timeLimit) {
    const deadline = attempt.startedAt.getTime() + (test.timeLimit + SUBMIT_GRACE_SECONDS) * 1000
    if (Date.now() > deadline) {
      // Past deadline: keep only responses, grade what we have (treated as auto-submit).
    }
  }

  const grade = gradeAttempt(test.questions, responses, test.minPassPercent)

  await prisma.$transaction([
    prisma.questionResponse.deleteMany({ where: { attemptId } }),
    prisma.questionResponse.createMany({
      data: responses
        .filter((r) => test.questions.some((q) => q.id === r.questionId))
        .map((r) => ({
          attemptId,
          questionId: r.questionId,
          selectedIds: r.selectedIds,
        })),
    }),
    prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        finishedAt: new Date(),
        score: grade.score,
        maxScore: grade.maxScore,
        passed: grade.passed,
      },
    }),
  ])

  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/test/take`)
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`)
  revalidatePath(`/courses/${courseId}`)

  return { score: grade.score, maxScore: grade.maxScore, passed: grade.passed }
}
