"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, AlertTriangle } from "lucide-react"
import { submitAttempt } from "../actions"

type Answer = { id: string; text: string }
type Question = { id: string; text: string; points: number; multiple: boolean; answers: Answer[] }

type Props = {
  courseId: string
  lessonId: string
  lessonName: string
  attemptId: string
  startedAt: string
  timeLimit: number | null // seconds
  questions: Question[]
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function TestRunner({
  courseId,
  lessonId,
  lessonName,
  attemptId,
  startedAt,
  timeLimit,
  questions,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const submittedRef = useRef(false)

  const deadline = timeLimit ? new Date(startedAt).getTime() + timeLimit * 1000 : null
  const [remaining, setRemaining] = useState<number | null>(
    deadline ? Math.max(0, Math.round((deadline - Date.now()) / 1000)) : null
  )

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    const responses = questions.map((q) => ({
      questionId: q.id,
      selectedIds: selected[q.id] ?? [],
    }))
    try {
      await submitAttempt(lessonId, attemptId, responses)
      router.refresh()
    } catch {
      submittedRef.current = false
      setSubmitting(false)
      alert("Odoslanie zlyhalo. Skúste to znova.")
    }
  }, [questions, selected, lessonId, attemptId, router])

  // Countdown
  useEffect(() => {
    if (deadline == null) return
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) doSubmit()
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [deadline, doSubmit])

  function toggle(q: Question, answerId: string) {
    if (submitting) return
    setSelected((prev) => {
      const cur = prev[q.id] ?? []
      if (q.multiple) {
        return {
          ...prev,
          [q.id]: cur.includes(answerId) ? cur.filter((x) => x !== answerId) : [...cur, answerId],
        }
      }
      return { ...prev, [q.id]: [answerId] }
    })
  }

  const answeredCount = questions.filter((q) => (selected[q.id]?.length ?? 0) > 0).length
  const lowTime = remaining != null && remaining <= 60

  function handleSubmitClick() {
    if (answeredCount < questions.length) {
      if (!confirm(`Nezodpovedali ste všetky otázky (${answeredCount}/${questions.length}). Naozaj odoslať?`))
        return
    } else if (!confirm("Odoslať test na vyhodnotenie?")) {
      return
    }
    doSubmit()
  }

  return (
    <div className="max-w-2xl space-y-6 pb-24">
      {/* Sticky header with timer + progress */}
      <div className="sticky top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 bg-background/90 backdrop-blur border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate">Test — {lessonName}</h1>
            <p className="text-xs text-muted-foreground">
              Zodpovedané {answeredCount} / {questions.length}
            </p>
          </div>
          {remaining != null && (
            <div
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold tabular-nums ${
                lowTime
                  ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                  : "bg-muted text-foreground"
              }`}
            >
              <Clock className="h-4 w-4" />
              {fmt(remaining)}
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {lowTime && remaining! > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-800 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Zostáva menej ako minúta — test sa po vypršaní automaticky odošle.
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const cur = selected[q.id] ?? []
          return (
            <div key={q.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                  <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>
                  {q.text}
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">{q.points} b</span>
              </div>
              {q.multiple && (
                <p className="text-xs text-muted-foreground">Možných je viacero správnych odpovedí.</p>
              )}
              <div className="space-y-2">
                {q.answers.map((a) => {
                  const checked = cur.includes(a.id)
                  return (
                    <label
                      key={a.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                        checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      } ${submitting ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      <input
                        type={q.multiple ? "checkbox" : "radio"}
                        name={q.id}
                        checked={checked}
                        onChange={() => toggle(q, a.id)}
                        className="h-4 w-4 accent-primary"
                      />
                      {a.text}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={submitting}
          className="bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? "Vyhodnocujem…" : "Odoslať test"}
        </button>
        <span className="text-xs text-muted-foreground">
          Zodpovedané {answeredCount} / {questions.length}
        </span>
      </div>
    </div>
  )
}
