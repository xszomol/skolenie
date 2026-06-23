import Link from "next/link"
import { CheckCircle2, XCircle, Check, X, ArrowLeft, RefreshCw } from "lucide-react"

type Answer = { id: string; text: string; isCorrect: boolean }
type Question = {
  id: string
  text: string
  points: number
  answers: Answer[]
  selectedIds: string[]
}

type Props = {
  courseId: string
  lessonId: string
  lessonName: string
  canRetry: boolean
  score: number
  maxScore: number
  passed: boolean
  minPassPercent: number | null
  questions: Question[]
}

function questionIsCorrect(q: Question): boolean {
  const correct = new Set(q.answers.filter((a) => a.isCorrect).map((a) => a.id))
  const sel = new Set(q.selectedIds)
  if (correct.size !== sel.size) return false
  for (const id of correct) if (!sel.has(id)) return false
  return true
}

export function AttemptResult({
  courseId,
  lessonId,
  lessonName,
  canRetry,
  score,
  maxScore,
  passed,
  minPassPercent,
  questions,
}: Props) {
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

  return (
    <div className="max-w-2xl space-y-6">
      {/* Result banner */}
      <div
        className={`rounded-xl border p-6 shadow-sm ${
          passed
            ? "bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/20"
            : "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20"
        }`}
      >
        <div className="flex items-center gap-4">
          <span className={passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
            {passed ? <CheckCircle2 className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {passed ? "Úspešne absolvované" : "Neúspešný pokus"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {lessonName} — získali ste{" "}
              <span className="font-medium text-foreground">
                {score} / {maxScore} bodov ({percent} %)
              </span>
              {minPassPercent != null && (
                <> · potrebných {minPassPercent} %</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Späť na kurz
        </Link>
        {canRetry && (
          <Link
            href={`/courses/${courseId}/lessons/${lessonId}/test/take`}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-4 w-4" />
            Skúsiť znova
          </Link>
        )}
      </div>

      {/* Per-question review */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Prehľad odpovedí</h2>
        {questions.map((q, idx) => {
          const correct = questionIsCorrect(q)
          return (
            <div key={q.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                  <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>
                  {q.text}
                </p>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    correct
                      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                  }`}
                >
                  {correct ? `+${q.points} b` : `0 / ${q.points} b`}
                </span>
              </div>
              <div className="space-y-2">
                {q.answers.map((a) => {
                  const chosen = q.selectedIds.includes(a.id)
                  // Visual: correct answers green, wrongly chosen red.
                  const tone = a.isCorrect
                    ? "border-green-300 bg-green-50 dark:bg-green-500/10 dark:border-green-500/30"
                    : chosen
                      ? "border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30"
                      : "border-border"
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${tone}`}
                    >
                      <span className="shrink-0">
                        {a.isCorrect ? (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : chosen ? (
                          <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <span className="inline-block h-4 w-4" />
                        )}
                      </span>
                      <span className="flex-1">{a.text}</span>
                      {chosen && (
                        <span className="shrink-0 text-xs text-muted-foreground">vaša voľba</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
