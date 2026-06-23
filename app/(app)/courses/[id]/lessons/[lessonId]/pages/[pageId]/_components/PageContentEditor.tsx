"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, GripVertical, Trash2, Plus, Eye, Upload } from "lucide-react"
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
import type { ContentBlock } from "@/types/content"
import { BlockRenderer } from "@/components/BlockRenderer"
import { updatePageContent, updatePageTitle } from "../../../actions"

type BlockItem = { id: string; block: ContentBlock }

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function SortableBlockEditor({
  item,
  onChange,
  onDelete,
}: {
  item: BlockItem
  onChange: (b: ContentBlock) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })
  const { block } = item

  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5 shrink-0"
      aria-label="Presunúť blok"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )

  const deleteBtn = (
    <button
      type="button"
      onClick={onDelete}
      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors shrink-0"
      title="Odstrániť blok"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )

  let inner: React.ReactNode

  if (block.type === "image") {
    inner = (
      <>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {dragHandle}
            <span className="text-xs text-muted-foreground font-medium">Obrázok</span>
          </div>
          {deleteBtn}
        </div>
        <div className="relative w-full bg-muted rounded overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <Image src={`/api/files/${block.key}`} alt="Slide" fill className="object-contain" unoptimized />
        </div>
      </>
    )
  } else if (block.type === "heading") {
    inner = (
      <>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {dragHandle}
            {([1, 2, 3] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onChange({ ...block, level })}
                className={`px-2 py-0.5 text-xs rounded font-mono transition-colors ${
                  block.level === level
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                H{level}
              </button>
            ))}
          </div>
          {deleteBtn}
        </div>
        <input
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Nadpis…"
          className={`w-full bg-transparent border-none focus:outline-none focus:ring-0 font-bold placeholder:text-muted-foreground/40 ${
            block.level === 1 ? "text-2xl" : block.level === 2 ? "text-xl" : "text-lg"
          }`}
        />
      </>
    )
  } else if (block.type === "paragraph") {
    inner = (
      <>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {dragHandle}
            <span className="text-xs text-muted-foreground font-medium">Odsek</span>
          </div>
          {deleteBtn}
        </div>
        <textarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Text odseku…"
          rows={Math.max(3, block.text.split("\n").length + 1)}
          className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-sm resize-none leading-relaxed placeholder:text-muted-foreground/40"
        />
      </>
    )
  } else if (block.type === "bulletList") {
    const b = block
    inner = (
      <>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {dragHandle}
            <button
              type="button"
              onClick={() => onChange({ ...b, ordered: false })}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                !b.ordered
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              • Odrážky
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...b, ordered: true })}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                b.ordered
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              1. Číslovaný
            </button>
          </div>
          {deleteBtn}
        </div>
        <div className="space-y-1.5">
          {b.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm shrink-0 w-5 text-right">
                {b.ordered ? `${i + 1}.` : "•"}
              </span>
              <input
                value={item}
                onChange={(e) =>
                  onChange({ ...b, items: b.items.map((it, idx) => (idx === i ? e.target.value : it)) })
                }
                placeholder="Položka…"
                className="flex-1 min-w-0 bg-transparent border-none focus:outline-none focus:ring-0 text-sm placeholder:text-muted-foreground/40"
              />
              <button
                type="button"
                onClick={() => {
                  const items = b.items.filter((_, idx) => idx !== i)
                  onChange({ ...b, items: items.length > 0 ? items : [""] })
                }}
                className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                title="Odstrániť položku"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...b, items: [...b.items, ""] })}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pl-7 pt-1"
          >
            <Plus className="h-3 w-3" /> Pridať položku
          </button>
        </div>
      </>
    )
  } else if (block.type === "media") {
    const b = block
    const label = b.mediaType === "image" ? "Obrázok" : b.mediaType === "video" ? "Video" : "Zvuk"
    inner = (
      <>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {dragHandle}
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
          </div>
          {deleteBtn}
        </div>
        {b.mediaType === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${b.key}`} alt={b.caption ?? ""} className="w-full rounded" />
        )}
        {b.mediaType === "video" && (
          <video src={`/api/files/${b.key}`} controls className="w-full rounded" />
        )}
        {b.mediaType === "audio" && (
          <audio src={`/api/files/${b.key}`} controls className="w-full" />
        )}
        <input
          value={b.caption ?? ""}
          onChange={(e) => onChange({ ...b, caption: e.target.value })}
          placeholder="Popis (nepovinný)…"
          className="w-full mt-2 bg-transparent border-none focus:outline-none focus:ring-0 text-xs text-muted-foreground placeholder:text-muted-foreground/40"
        />
      </>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border rounded-lg p-3 transition-colors ${
        isDragging ? "bg-muted shadow-md relative z-10 opacity-80" : ""
      }`}
    >
      {inner}
    </div>
  )
}

export function PageContentEditor({
  pageId,
  lessonId,
  initialContent,
  initialTitle,
  pageOrder,
  backHref,
  lessonName,
  pageDisplayTitle,
}: {
  pageId: string
  lessonId: string
  initialContent: ContentBlock[]
  initialTitle: string | null
  pageOrder: number
  backHref: string
  lessonName: string
  pageDisplayTitle: string
}) {
  const router = useRouter()
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<BlockItem[]>(() =>
    initialContent.map((block) => ({ id: uid(), block }))
  )
  const [title, setTitle] = useState(initialTitle ?? "")
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  const goBack = useCallback(() => {
    if (dirty) { setShowLeaveDialog(true); return }
    router.push(backHref)
  }, [dirty, backHref, router])

  async function saveAndLeave() {
    setSaving(true)
    await Promise.all([
      updatePageContent(lessonId, pageId, items.map((i) => i.block)),
      updatePageTitle(lessonId, pageId, title),
    ])
    setSaving(false)
    setDirty(false)
    router.push(backHref)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function markDirty() {
    setDirty(true)
    setSaved(false)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    setItems(arrayMove(items, oldIndex, newIndex))
    markDirty()
  }

  function updateBlock(id: string, block: ContentBlock) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, block } : item)))
    markDirty()
  }

  function deleteBlock(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id))
    markDirty()
  }

  function addBlock(type: "heading" | "paragraph" | "bulletList") {
    const block: ContentBlock =
      type === "heading"
        ? { type: "heading", level: 1, text: "" }
        : type === "paragraph"
        ? { type: "paragraph", text: "" }
        : { type: "bulletList", items: [""] }
    setItems((prev) => [...prev, { id: uid(), block }])
    markDirty()
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(`/api/lessons/${lessonId}/media`, { method: "POST", body: form })
      if (res.ok) {
        const { key, mediaType } = await res.json()
        setItems((prev) => [...prev, { id: uid(), block: { type: "media", mediaType, key } }])
        markDirty()
      } else {
        const body = await res.json().catch(() => ({}))
        setUploadError(body.error ?? `Chyba pri nahrávaní (${res.status})`)
      }
    } catch {
      setUploadError("Nepodarilo sa nahrať súbor. Skontrolujte pripojenie.")
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaving(true)
    await Promise.all([
      updatePageContent(lessonId, pageId, items.map((i) => i.block)),
      updatePageTitle(lessonId, pageId, title),
    ])
    setSaving(false)
    setSaved(true)
    setDirty(false)
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {lessonName}
        </button>
        <span className="text-muted-foreground/50 text-sm">/</span>
        <span className="text-sm text-muted-foreground">{pageDisplayTitle}</span>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Názov stránky</label>
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); markDirty() }}
          placeholder={`Stránka ${pageOrder}`}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addBlock("heading")}
            className="flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Nadpis
          </button>
          <button
            type="button"
            onClick={() => addBlock("paragraph")}
            className="flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Odsek
          </button>
          <button
            type="button"
            onClick={() => addBlock("bulletList")}
            className="flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Zoznam
          </button>
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" /> {uploading ? "Nahrávam…" : "Médiá"}
          </button>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={handleMediaUpload}
          />
        </div>
        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className="flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          <Eye className="h-3.5 w-3.5" /> Náhľad
        </button>
      </div>

      {uploadError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{uploadError}</p>
      )}

      {/* Edit mode — always visible */}
      <>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((item) => (
                <SortableBlockEditor
                  key={item.id}
                  item={item}
                  onChange={(b) => updateBlock(item.id, b)}
                  onDelete={() => deleteBlock(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </>

      {/* Preview modal — scrollable lightbox */}
      {previewing && (() => {
        const allBlocks = items.map((i) => i.block)
        const imageBlock = allBlocks.find((b) => b.type === "image")
        const textBlocks = allBlocks.filter((b) => b.type !== "image")
        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 overflow-y-auto"
            onClick={() => setPreviewing(false)}
          >
            <button
              type="button"
              onClick={() => setPreviewing(false)}
              className="fixed top-4 right-4 z-10 text-white/70 hover:text-white text-2xl leading-none"
              aria-label="Zavrieť náhľad"
            >✕</button>

            <div
              className="w-full max-w-3xl mx-auto py-10 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-xl bg-white overflow-hidden shadow-2xl">
                {imageBlock && imageBlock.type === "image" && (
                  <div className="relative w-full bg-muted" style={{ aspectRatio: "16/9" }}>
                    <Image
                      src={`/api/files/${imageBlock.key}`}
                      alt="Slide"
                      fill
                      className="object-contain"
                      unoptimized
                      priority
                    />
                  </div>
                )}
                {textBlocks.length > 0 && (
                  <div className={`p-6 space-y-3 text-gray-900 ${imageBlock ? "border-t" : ""}`}>
                    <BlockRenderer blocks={textBlocks} />
                  </div>
                )}
                {items.length === 0 && (
                  <div className="py-16 text-center text-sm text-gray-400">
                    Stránka nemá žiadny obsah.
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Save bar */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Ukladám…" : "Uložiť"}
        </button>
        <button
          type="button"
          onClick={goBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Späť na lekciu
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">Uložené</span>
        )}
        {dirty && !saved && (
          <span className="text-sm text-amber-600 dark:text-amber-400">Neuložené zmeny</span>
        )}
      </div>

      {/* Leave confirmation dialog */}
      {showLeaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <p className="font-medium">Máte neuložené zmeny</p>
            <p className="text-sm text-muted-foreground">Chcete ich uložiť pred odchodom?</p>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={saveAndLeave}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Ukladám…" : "Uložiť a odísť"}
              </button>
              <button
                type="button"
                onClick={() => { setShowLeaveDialog(false); router.push(backHref) }}
                className="w-full border rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Odísť bez uloženia
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveDialog(false)}
                className="w-full rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Zostať na stránke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
