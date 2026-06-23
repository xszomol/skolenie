// Pure grading helpers for test attempts.

export type GradableAnswer = { id: string; isCorrect: boolean }
export type GradableQuestion = { id: string; points: number; answers: GradableAnswer[] }
export type SubmittedResponse = { questionId: string; selectedIds: string[] }

export type GradeResult = {
  score: number
  maxScore: number
  passed: boolean
  /** Per-question breakdown for the review screen. */
  perQuestion: { questionId: string; correct: boolean; points: number }[]
}

/**
 * A question is scored all-or-nothing: the participant earns its points only if
 * the set of selected answers exactly matches the set of correct answers.
 */
export function isQuestionCorrect(question: GradableQuestion, selectedIds: string[]): boolean {
  const correct = new Set(question.answers.filter((a) => a.isCorrect).map((a) => a.id))
  const selected = new Set(selectedIds)
  if (correct.size !== selected.size) return false
  for (const id of correct) if (!selected.has(id)) return false
  return true
}

export function gradeAttempt(
  questions: GradableQuestion[],
  responses: SubmittedResponse[],
  minPassPercent: number | null
): GradeResult {
  const selectedByQuestion = new Map(responses.map((r) => [r.questionId, r.selectedIds]))

  let score = 0
  let maxScore = 0
  const perQuestion: GradeResult["perQuestion"] = []

  for (const q of questions) {
    maxScore += q.points
    const selected = selectedByQuestion.get(q.id) ?? []
    const correct = isQuestionCorrect(q, selected)
    if (correct) score += q.points
    perQuestion.push({ questionId: q.id, correct, points: q.points })
  }

  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0
  // No threshold configured → any completed attempt passes.
  const passed = minPassPercent == null ? true : percent >= minPassPercent

  return { score, maxScore, passed, perQuestion }
}
