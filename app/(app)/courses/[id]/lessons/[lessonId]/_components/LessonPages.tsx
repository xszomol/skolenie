"use client"

import { useEffect, useState, useTransition } from "react"
import Image from "next/image"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Pencil, Check, X, LayoutList } from "lucide-react"
import Link from "next/link"
import { reorderPages, deletePage, deletePages, updatePageTitle, addBlankPage } from "../actions"
import { BlockRenderer } from "@/components/BlockRenderer"
import type { ContentBlock } from "@/types/content"

type Page = {
  id: string
  order: number
  title: string | null
  imageKey: string | null
  textBlocks: ContentBlock[]
}

function SortablePage({
  page,
  lessonId,
  courseId,
  isSelected,
  onToggle,
  onPreview,
}: {
  page: Page
  lessonId: string
  courseId: string
  isSelected: boolean
  onToggle: () => void
  onPreview: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(page.title ?? "")
  const [saving, setSaving] = useState(false)

  async function saveTitle() {
    setSaving(true)
    await updatePageTitle(lessonId, page.id, draft)
    setSaving(false)
    setEditing(false)
  }

  function cancelEdit() {
    setDraft(page.title ?? "")
    setEditing(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); saveTitle() }
    else if (e.key === "Escape") cancelEdit()
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border rounded-lg p-3 flex items-center gap-3 transition-colors ${
        isDragging
          ? "bg-muted shadow-md relative z-10 opacity-80"
          : isSelected
          ? "bg-primary/5 border-primary/30"
          : ""
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 p-0.5 -ml-0.5"
        aria-label="Presunúť stránku"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 rounded border-gray-300 accent-primary"
        aria-label={`Vybrať stránku ${page.order}`}
      />

      {/* Thumbnail */}
      <button
        type="button"
        onClick={onPreview}
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
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={saving}
              placeholder={`Stránka ${page.order}`}
              className="flex-1 min-w-0 text-sm border rounded px-2 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="button"
              onClick={saveTitle}
              disabled={saving}
              className="p-1 rounded hover:bg-muted text-primary transition-colors disabled:opacity-50"
              title="Uložiť"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
              title="Zrušiť"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group/title">
            <button
              type="button"
              onClick={onPreview}
              className="text-sm font-medium truncate hover:text-primary transition-colors text-left"
            >
              {page.title ?? `Stránka ${page.order}`}
            </button>
            <button
              type="button"
              onClick={() => { setDraft(page.title ?? ""); setEditing(true) }}
              className="opacity-0 group-hover/title:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground transition-all shrink-0"
              title="Upraviť názov"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Edit content link + Delete */}
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href={`/courses/${courseId}/lessons/${lessonId}/pages/${page.id}`}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
          title="Upraviť obsah"
        >
          <LayoutList className="h-4 w-4" />
        </Link>
        <form action={deletePage.bind(null, lessonId, page.id)}>
          <button
            type="submit"
            className="p-1.5 rounded hover:bg-muted text-destructive transition-colors text-sm"
            title="Zmazať stránku"
          >×</button>
        </form>
      </div>
    </div>
  )
}

export function LessonPages({
  lessonId,
  courseId,
  pages: initialPages,
  participantCount,
}: {
  lessonId: string
  courseId: string
  pages: Page[]
  participantCount: number
}) {
  const [pages, setPages] = useState(initialPages)
  const [preview, setPreview] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  // Sync local state from server after mutations (delete, add blank page)
  useEffect(() => {
    if (!isPending) setPages(initialPages)
  }, [initialPages, isPending])

  const allSelected = pages.length > 0 && selected.size === pages.length

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = pages.findIndex((p) => p.id === active.id)
    const newIndex = pages.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(pages, oldIndex, newIndex).map((p, i) => ({
      ...p,
      order: i + 1,
    }))

    setPages(reordered)
    startTransition(() => reorderPages(lessonId, reordered.map((p) => p.id)))
  }

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
          {selected.size > 0 ? (
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={isPending}
              className="text-sm text-destructive border border-destructive/40 rounded-md px-3 py-1 hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {isPending ? "Odstraňujem…" : `Odstrániť vybrané (${selected.size})`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startTransition(() => addBlankPage(lessonId))}
              disabled={isPending}
              className="text-sm border rounded-md px-3 py-1 hover:bg-muted transition-colors disabled:opacity-50"
            >
              + Pridať stránku
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

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {pages.map((page, idx) => (
                  <SortablePage
                    key={page.id}
                    page={page}
                    lessonId={lessonId}
                    courseId={courseId}
                    isSelected={selected.has(page.id)}
                    onToggle={() => toggleOne(page.id)}
                    onPreview={() => openPreview(idx)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Lightbox */}
      {preview !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 overflow-y-auto"
          onClick={closePreview}
          onKeyDown={onKeyDown}
          tabIndex={-1}
          role="dialog"
          aria-modal
          aria-label="Náhľad stránky"
          ref={(el) => el?.focus()}
        >
          {/* Close button — always visible */}
          <button
            type="button"
            onClick={closePreview}
            className="fixed top-4 right-4 z-10 text-white/70 hover:text-white text-2xl leading-none"
            aria-label="Zavrieť"
          >✕</button>

          {/* Prev / next — always visible */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev() }}
            disabled={preview === 0}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white disabled:opacity-20 text-4xl px-2"
            aria-label="Predchádzajúca stránka"
          >‹</button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            disabled={preview === pages.length - 1}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white disabled:opacity-20 text-4xl px-2"
            aria-label="Nasledujúca stránka"
          >›</button>

          {/* Scrollable content */}
          <div
            className="flex flex-col items-center gap-4 max-w-5xl w-full mx-auto px-16 py-10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white/60 text-sm">{preview + 1} / {pages.length}</p>

            <div className="w-full bg-white rounded-lg overflow-hidden">
              {pages[preview].imageKey && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/files/${pages[preview].imageKey}`}
                  alt={pages[preview].title ?? `Stránka ${pages[preview].order}`}
                  className="w-full h-auto block"
                />
              )}
              {pages[preview].textBlocks.length > 0 && (
                <div className={`p-5 text-gray-900 ${pages[preview].imageKey ? "border-t" : ""}`}>
                  <BlockRenderer blocks={pages[preview].textBlocks} />
                </div>
              )}
              {!pages[preview].imageKey && pages[preview].textBlocks.length === 0 && (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  Bez obsahu
                </div>
              )}
            </div>

            <p className="text-white/80 text-sm">
              {pages[preview].title ?? `Stránka ${pages[preview].order}`}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
