"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  upsertTestSettings,
  deleteTest,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  moveQuestion,
} from "../actions"

type Answer = { id?: string; text: string; isCorrect: boolean }
type Question = { id: string; text: string; points: number; order: number; answers: Answer[] }
type TestSettings = {
  id: string
  introText: string | null
  timeLimit: number | null
  minPassPercent: number | null
  maxRetries: number
  randomOrder: boolean
}

type Props = {
  lessonId: string
  courseId: string
  lessonName: string
  test: TestSettings | null
  questions: Question[]
}

export function TestBuilder({ lessonId, courseId, lessonName, test, questions: initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [questions, setQuestions] = useState<Question[]>(initial)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Question | null>(null)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const settingsFormRef = useRef<HTMLFormElement>(null)

  function refresh() {
    router.refresh()
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  async function handleSaveSettings(formData: FormData) {
    await upsertTestSettings(lessonId, formData)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 3000)
    refresh()
  }

  async function handleDeleteTest() {
    if (!confirm("Naozaj odstrániť celý test vrátane všetkých otázok?")) return
    await deleteTest(lessonId)
  }

  // ── Questions ─────────────────────────────────────────────────────────────

  function openEdit(q: Question) {
    setDraft(JSON.parse(JSON.stringify(q))) // deep copy
    setExpandedId(q.id)
  }

  function closeEdit() {
    setDraft(null)
    setExpandedId(null)
  }

  async function handleAddQuestion() {
    if (!test) return
    startTransition(async () => {
      const { id, order } = await addQuestion(test.id, lessonId)
      const newQ: Question = { id, order, text: "", points: 1, answers: [] }
      setQuestions((prev) => [...prev, newQ])
      setDraft(newQ)
      setExpandedId(id)
    })
  }

  async function handleSaveQuestion() {
    if (!draft) return
    startTransition(async () => {
      await updateQuestion(draft.id, lessonId, {
        text: draft.text,
        points: draft.points,
        answers: draft.answers,
      })
      setQuestions((prev) => prev.map((q) => (q.id === draft.id ? { ...draft } : q)))
      closeEdit()
      refresh()
    })
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Naozaj odstrániť túto otázku?")) return
    startTransition(async () => {
      await deleteQuestion(questionId, lessonId)
      setQuestions((prev) => prev.filter((q) => q.id !== questionId).map((q, i) => ({ ...q, order: i + 1 })))
      if (expandedId === questionId) closeEdit()
    })
  }

  async function handleMove(questionId: string, direction: "up" | "down") {
    if (!test) return
    startTransition(async () => {
      await moveQuestion(test.id, questionId, direction, lessonId)
      setQuestions((prev) => {
        const arr = [...prev]
        const idx = arr.findIndex((q) => q.id === questionId)
        const swapIdx = direction === "up" ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= arr.length) return arr;
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
        return arr.map((q, i) => ({ ...q, order: i + 1 }))
      })
    })
  }

  // ── Draft answer helpers ──────────────────────────────────────────────────

  function addAnswer() {
    setDraft((d) => d ? { ...d, answers: [...d.answers, { text: "", isCorrect: false }] } : d)
  }

  function updateAnswer(idx: number, patch: Partial<Answer>) {
    setDraft((d) => {
      if (!d) return d
      const answers = d.answers.map((a, i) => (i === idx ? { ...a, ...patch } : a))
      return { ...d, answers }
    })
  }

  function removeAnswer(idx: number) {
    setDraft((d) => d ? { ...d, answers: d.answers.filter((_, i) => i !== idx) } : d)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Breadcrumb */}
      <p className="text-sm text-muted-foreground">
        <a href={`/courses/${courseId}`} className="hover:underline">{lessonName.split(" — ")[0]}</a>
        {" / "}
        <a href={`/courses/${courseId}/lessons/${lessonId}`} className="hover:underline">{lessonName}</a>
        {" / Test"}
      </p>

      {/* ── Test settings ── */}
      <section className="border rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-medium">Nastavenia testu</h2>

        {settingsSaved && (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
            Nastavenia uložené.
          </div>
        )}

        <form ref={settingsFormRef} action={handleSaveSettings} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="introText">Úvodný text (zobrazí sa pred spustením)</label>
            <textarea
              id="introText"
              name="introText"
              rows={3}
              defaultValue={test?.introText ?? ""}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="timeLimit">Čas (min)</label>
              <input
                id="timeLimit"
                name="timeLimit"
                type="number"
                min="1"
                defaultValue={test?.timeLimit != null ? Math.round(test.timeLimit / 60) : ""}
                placeholder="—"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="minPassPercent">Min. % na zvládnutie</label>
              <input
                id="minPassPercent"
                name="minPassPercent"
                type="number"
                min="0"
                max="100"
                defaultValue={test?.minPassPercent ?? ""}
                placeholder="—"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="maxRetries">Max. opakovaní</label>
              <input
                id="maxRetries"
                name="maxRetries"
                type="number"
                min="0"
                defaultValue={test?.maxRetries ?? 0}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Náhodné poradie</label>
              <div className="flex items-center h-10 gap-2">
                <select
                  name="randomOrder"
                  defaultValue={test?.randomOrder ? "true" : "false"}
                  className="border rounded-md px-2 py-2 text-sm bg-background"
                >
                  <option value="false">Nie</option>
                  <option value="true">Áno</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Uložiť nastavenia
            </button>
            {test && (
              <button
                type="button"
                onClick={handleDeleteTest}
                className="text-sm text-destructive hover:underline"
              >
                Odstrániť test
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ── Questions ── */}
      {test && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Otázky ({questions.length})</h2>
            <button
              type="button"
              onClick={handleAddQuestion}
              disabled={isPending || expandedId !== null}
              className="border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              + Pridať otázku
            </button>
          </div>

          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground">Zatiaľ žiadne otázky. Pridajte prvú otázku.</p>
          )}

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const isEditing = expandedId === q.id

              return (
                <div key={q.id} className={`border rounded-lg transition-colors ${isEditing ? "border-primary/40 bg-primary/5" : ""}`}>
                  {/* Question header */}
                  <div className="flex items-center gap-3 p-3">
                    <span className="shrink-0 text-xs font-mono text-muted-foreground w-5 text-right">{q.order}.</span>
                    <p className="flex-1 text-sm font-medium min-w-0 truncate">
                      {q.text || <span className="text-muted-foreground italic">Bez textu</span>}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">{q.points} b</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{q.answers.length} odp.</span>

                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMove(q.id, "up")}
                          disabled={idx === 0 || isPending}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30 text-sm"
                          title="Nahor"
                        >↑</button>
                        <button
                          type="button"
                          onClick={() => handleMove(q.id, "down")}
                          disabled={idx === questions.length - 1 || isPending}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30 text-sm"
                          title="Nadol"
                        >↓</button>
                        <button
                          type="button"
                          onClick={() => openEdit(q)}
                          className="px-2 py-1 rounded border text-xs hover:bg-muted transition-colors"
                        >Upraviť</button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          disabled={isPending}
                          className="p-1 rounded hover:bg-muted text-destructive text-sm"
                          title="Zmazať"
                        >×</button>
                      </div>
                    )}
                  </div>

                  {/* Inline editor */}
                  {isEditing && draft && (
                    <div className="border-t px-4 py-4 space-y-4">
                      {/* Question text + points */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Text otázky</label>
                        <textarea
                          rows={2}
                          value={draft.text}
                          onChange={(e) => setDraft((d) => d ? { ...d, text: e.target.value } : d)}
                          className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
                          placeholder="Napíšte znenie otázky…"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium">Body</label>
                        <input
                          type="number"
                          min="1"
                          value={draft.points}
                          onChange={(e) => setDraft((d) => d ? { ...d, points: parseInt(e.target.value) || 1 } : d)}
                          className="w-20 border rounded-md px-3 py-1.5 text-sm bg-background"
                        />
                      </div>

                      {/* Answers */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Odpovede</p>
                        {draft.answers.length === 0 && (
                          <p className="text-xs text-muted-foreground">Zatiaľ žiadne odpovede.</p>
                        )}
                        {draft.answers.map((a, aIdx) => (
                          <div key={aIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={a.text}
                              onChange={(e) => updateAnswer(aIdx, { text: e.target.value })}
                              placeholder={`Odpoveď ${aIdx + 1}`}
                              className="flex-1 border rounded-md px-3 py-1.5 text-sm bg-background"
                            />
                            <label className="flex items-center gap-1.5 text-xs shrink-0 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={a.isCorrect}
                                onChange={(e) => updateAnswer(aIdx, { isCorrect: e.target.checked })}
                                className="h-4 w-4 accent-green-600"
                              />
                              Správna
                            </label>
                            <button
                              type="button"
                              onClick={() => removeAnswer(aIdx)}
                              className="p-1 rounded hover:bg-muted text-destructive text-sm shrink-0"
                              title="Odstrániť odpoveď"
                            >×</button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addAnswer}
                          className="text-xs text-primary hover:underline"
                        >+ Pridať odpoveď</button>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveQuestion}
                          disabled={isPending || !draft.text.trim()}
                          className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {isPending ? "Ukladám…" : "Uložiť otázku"}
                        </button>
                        <button
                          type="button"
                          onClick={closeEdit}
                          disabled={isPending}
                          className="border rounded-md px-4 py-1.5 text-sm hover:bg-muted transition-colors"
                        >
                          Zrušiť
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
