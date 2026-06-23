"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, ListChecks } from "lucide-react"
import { recordPage, completeLesson } from "../actions"
import { BlockRenderer } from "@/components/BlockRenderer"
import type { ContentBlock } from "@/types/content"

type Page = { id: string; title: string | null; imageKey: string | null; textBlocks: ContentBlock[] }

type Props = {
  courseId: string
  courseName: string
  lessonId: string
  lessonName: string
  minPageTime: number
  hasTest: boolean
  completedPageIds: string[]
  pages: Page[]
}

export function LessonViewer({
  courseId,
  courseName,
  lessonId,
  lessonName,
  minPageTime,
  hasTest,
  completedPageIds,
  pages,
}: Props) {
  const router = useRouter()
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedPageIds))
  const [index, setIndex] = useState(() => {
    const firstIncomplete = pages.findIndex((p) => !completedPageIds.includes(p.id))
    return firstIncomplete === -1 ? 0 : firstIncomplete
  })
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [busy, setBusy] = useState(false)

  const current = pages[index]
  const isLast = index === pages.length - 1
  const alreadyDone = current ? completed.has(current.id) : false
  const remaining = alreadyDone ? 0 : Math.max(0, minPageTime - elapsed)
  const canAdvance = remaining === 0
  const lessonAlreadyDone = pages.length > 0 && pages.every((p) => completed.has(p.id))

  // Count up time on the current page.
  useEffect(() => {
    setElapsed(0)
    if (!current) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [index, current])

  if (pages.length === 0) {
    return (
      <div className="max-w-2xl space-y-4">
        <Breadcrumb courseId={courseId} courseName={courseName} lessonName={lessonName} />
        <p className="text-sm text-muted-foreground">Táto lekcia zatiaľ nemá žiadne stránky.</p>
      </div>
    )
  }

  async function persist(pageId: string, seconds: number) {
    try {
      await recordPage(lessonId, pageId, seconds)
    } catch {
      /* progress is best-effort; ignore transient failures */
    }
  }

  async function goNext() {
    if (!canAdvance || busy || !current) return
    setBusy(true)
    await persist(current.id, Math.max(elapsed, minPageTime))
    setCompleted((prev) => new Set(prev).add(current.id))

    if (isLast) {
      try {
        await completeLesson(lessonId)
        setFinished(true)
        router.refresh()
      } catch {
        /* ignore */
      }
    } else {
      setIndex((i) => i + 1)
    }
    setBusy(false)
  }

  async function goPrev() {
    if (index === 0 || busy || !current) return
    setBusy(true)
    await persist(current.id, elapsed)
    setIndex((i) => i - 1)
    setBusy(false)
  }

  // ── Completion screen ──
  if (finished) {
    return (
      <div className="max-w-2xl space-y-6">
        <Breadcrumb courseId={courseId} courseName={courseName} lessonName={lessonName} />
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm dark:bg-green-500/10 dark:border-green-500/20">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Lekcia dokončená</h1>
              <p className="text-sm text-muted-foreground">{lessonName} — prešli ste všetky stránky.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/courses/${courseId}`}
            className="inline-flex items-center gap-1.5 border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Späť na kurz
          </Link>
          {hasTest && (
            <Link
              href={`/courses/${courseId}/lessons/${lessonId}/test/take`}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <ListChecks className="h-4 w-4" /> Pokračovať na test
            </Link>
          )}
        </div>
      </div>
    )
  }

  // ── Viewer ──
  const progressPct = (completed.size / pages.length) * 100

  return (
    <div className="max-w-3xl space-y-4">
      <Breadcrumb courseId={courseId} courseName={courseName} lessonName={lessonName} />

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Stránka {index + 1} / {pages.length}
          </span>
          <span>{completed.size} / {pages.length} dokončených</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Slide */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {current.imageKey ? (
          <div className="relative w-full bg-muted" style={{ aspectRatio: "16/9" }}>
            <Image
              src={`/api/files/${current.imageKey}`}
              alt={current.title ?? `Stránka ${index + 1}`}
              fill
              className="object-contain"
              unoptimized
              priority
            />
          </div>
        ) : !current.imageKey && current.textBlocks.length === 0 ? (
          <div className="relative w-full bg-muted flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
            <span className="text-sm text-muted-foreground">Bez obsahu</span>
          </div>
        ) : null}

        {current.textBlocks.length > 0 && (
          <div className={`p-5 space-y-3 ${current.imageKey ? "border-t" : ""}`}>
            <BlockRenderer blocks={current.textBlocks} />
          </div>
        )}

        {current.title && (
          <p className="px-4 py-3 text-sm font-medium border-t">{current.title}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0 || busy}
          className="inline-flex items-center gap-1.5 border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Späť
        </button>

        <div className="flex items-center gap-3">
          {hasTest && lessonAlreadyDone && (
            <Link
              href={`/courses/${courseId}/lessons/${lessonId}/test/take`}
              className="inline-flex items-center gap-1.5 border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <ListChecks className="h-4 w-4" /> Test
            </Link>
          )}
          {!canAdvance && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              ešte {remaining} s
            </span>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance || busy}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLast ? "Dokončiť lekciu" : "Ďalej"}
            {!isLast && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

function Breadcrumb({
  courseId,
  courseName,
  lessonName,
}: {
  courseId: string
  courseName: string
  lessonName: string
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Link
        href={`/courses/${courseId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {courseName}
      </Link>
      <span className="text-muted-foreground/50 text-sm">/</span>
      <span className="text-sm text-muted-foreground">{lessonName}</span>
    </div>
  )
}
