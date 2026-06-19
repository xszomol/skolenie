"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { movePage, deletePage, deletePages } from "../actions"

type Page = {
  id: string
  order: number
  title: string | null
  imageKey: string | null
}

export function LessonPages({
  lessonId,
  pages,
  participantCount,
}: {
  lessonId: string
  pages: Page[]
  participantCount: number
}) {
  const [preview, setPreview] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const allSelected = pages.length > 0 && selected.size === pages.length

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(pages.map((p) => p.id)))
  }

  function handleDeleteSelected() {
    if (!confirm(`Naozaj odstrániť ${selected.size} stránok? Akcia je nevratná.`)) return
    const ids = Array.from(selected)
    startTransition(async () => {
      await deletePages(lessonId, ids)
      setSelected(new Set())
    })
  }

  function openPreview(idx: number) { setPreview(idx) }
  function closePreview() { setPreview(null) }
  function prev() { setPreview((i) => (i !== null && i > 0 ? i - 1 : i)) }
  function next() { setPreview((i) => (i !== null && i < pages.length - 1 ? i + 1 : i)) }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") prev()
    else if (e.key === "ArrowRight") next()
    else if (e.key === "Escape") closePreview()
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-medium">Stránky ({pages.length})</h2>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={isPending}
              className="text-sm text-destructive border border-destructive/40 rounded-md px-3 py-1 hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {isPending ? "Odstraňujem…" : `Odstrániť vybrané (${selected.size})`}
            </button>
          )}
          <span className="text-xs text-muted-foreground">{participantCount} účastníkov v kurze</span>
        </div>
      </div>

      {pages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Zatiaľ žiadne stránky. Nahrajte PDF alebo PPT.</p>
      ) : (
        <div className="space-y-2">
          {/* Select all row */}
          <div className="flex items-center gap-3 px-3 py-1.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-gray-300 accent-primary"
              aria-label="Vybrať všetky stránky"
            />
            <span>{allSelected ? "Zrušiť výber" : "Vybrať všetky"}</span>
          </div>

          {pages.map((page, idx) => {
            const moveUpAction = movePage.bind(null, lessonId, page.id, "up")
            const moveDownAction = movePage.bind(null, lessonId, page.id, "down")
            const deletePageAction = deletePage.bind(null, lessonId, page.id)
            const isSelected = selected.has(page.id)

            return (
              <div
                key={page.id}
                className={`border rounded-lg p-3 flex items-center gap-3 transition-colors ${
                  isSelected ? "bg-primary/5 border-primary/30" : ""
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(page.id)}
                  className="h-4 w-4 shrink-0 rounded border-gray-300 accent-primary"
                  aria-label={`Vybrať stránku ${page.order}`}
                />

                {/* Thumbnail */}
                <button
                  type="button"
                  onClick={() => openPreview(idx)}
                  className="w-24 h-16 shrink-0 bg-muted rounded overflow-hidden relative hover:ring-2 hover:ring-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                  title="Zobraziť náhľad"
                >
                  {page.imageKey ? (
                    <Image
                      src={`/api/files/${page.imageKey}`}
                      alt={page.title ?? `Stránka ${page.order}`}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="flex items-center justify-center h-full text-xs text-muted-foreground">
                      {page.order}
                    </span>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {page.title ?? `Stránka ${page.order}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => openPreview(idx)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Zobraziť náhľad
                  </button>
                </div>

                {/* Reorder + delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <form action={moveUpAction}>
                    <button
                      type="submit"
                      disabled={idx === 0}
                      className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors text-sm"
                      title="Posunúť nahor"
                    >↑</button>
                  </form>
                  <form action={moveDownAction}>
                    <button
                      type="submit"
                      disabled={idx === pages.length - 1}
                      className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors text-sm"
                      title="Posunúť nadol"
                    >↓</button>
                  </form>
                  <form action={deletePageAction}>
                    <button
                      type="submit"
                      className="p-1.5 rounded hover:bg-muted text-destructive transition-colors text-sm"
                      title="Zmazať stránku"
                    >×</button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {preview !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={closePreview}
          onKeyDown={onKeyDown}
          tabIndex={-1}
          role="dialog"
          aria-modal
          aria-label="Náhľad stránky"
          ref={(el) => el?.focus()}
        >
          <div
            className="relative flex flex-col items-center gap-4 max-w-5xl w-full px-16"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePreview}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl leading-none"
              aria-label="Zavrieť"
            >✕</button>

            <p className="text-white/60 text-sm">{preview + 1} / {pages.length}</p>

            <div className="relative w-full bg-white rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
              {pages[preview].imageKey ? (
                <Image
                  src={`/api/files/${pages[preview].imageKey}`}
                  alt={pages[preview].title ?? `Stránka ${pages[preview].order}`}
                  fill
                  className="object-contain"
                  unoptimized
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Bez obrázka
                </div>
              )}
            </div>

            <p className="text-white/80 text-sm">
              {pages[preview].title ?? `Stránka ${pages[preview].order}`}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev() }}
            disabled={preview === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white disabled:opacity-20 text-4xl px-2"
            aria-label="Predchádzajúca stránka"
          >‹</button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            disabled={preview === pages.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white disabled:opacity-20 text-4xl px-2"
            aria-label="Nasledujúca stránka"
          >›</button>
        </div>
      )}
    </>
  )
}
