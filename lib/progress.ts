import type { Lesson, LessonProgress, Test, TestAttempt } from "@prisma/client"

type LessonWithTest = Lesson & { test: Test | null }

export type StatusColor = "green" | "orange" | "red" | null

export function computeParticipantProgress(
  userId: string,
  lessons: LessonWithTest[],
  lessonProgress: LessonProgress[],
  testAttempts: TestAttempt[]
): { percent: number; color: StatusColor } {
  const userProgress = lessonProgress.filter((p) => p.userId === userId)
  const userAttempts = testAttempts.filter((a) => a.userId === userId && a.finishedAt)

  const totalItems = lessons.length + lessons.filter((l) => l.test).length
  if (totalItems === 0) return { percent: 0, color: null }

  const completedLessons = lessons.filter((l) =>
    userProgress.some((p) => p.lessonId === l.id && p.completedAt)
  ).length

  // Best attempt per test: passed attempt wins, otherwise most recent
  const bestAttemptByTestId = new Map<string, TestAttempt>()
  for (const attempt of userAttempts) {
    const existing = bestAttemptByTestId.get(attempt.testId)
    if (!existing || (attempt.passed && !existing.passed)) {
      bestAttemptByTestId.set(attempt.testId, attempt)
    }
  }

  const completedTests = bestAttemptByTestId.size
  const percent = Math.round(((completedLessons + completedTests) / totalItems) * 100)

  // Status color — only applies once all mandatory items are done
  const mandatory = lessons.filter((l) => l.mandatory)

  const allMandatoryLessonsDone = mandatory.every((l) =>
    userProgress.some((p) => p.lessonId === l.id && p.completedAt)
  )
  const mandatoryWithTest = mandatory.filter((l) => l.test)
  const allMandatoryTestsDone = mandatoryWithTest.every((l) =>
    bestAttemptByTestId.has(l.test!.id)
  )

  if (!allMandatoryLessonsDone || !allMandatoryTestsDone) {
    return { percent, color: null }
  }

  const failedMandatoryTests = mandatoryWithTest.filter((l) => {
    const test = l.test!
    if (!test.minPassPercent) return false
    return !bestAttemptByTestId.get(test.id)?.passed
  })

  if (failedMandatoryTests.length === 0) return { percent, color: "green" }

  const hasRetries = failedMandatoryTests.some((l) => {
    const test = l.test!
    const attemptCount = userAttempts.filter((a) => a.testId === test.id).length
    return attemptCount < 1 + test.maxRetries
  })

  return { percent, color: hasRetries ? "orange" : "red" }
}
