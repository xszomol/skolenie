"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, X } from "lucide-react"
import { updateCourseInline } from "../actions"
import { DeleteCourseButton } from "./DeleteCourseButton"

type Props = {
  courseId: string
  name: string
  description: string
  startDate: string
  endDate: string
  materialsAfterEnd: boolean
  primaryTrainerName: string
  canEdit: boolean
  canDelete: boolean
}

export function CourseHeader({
  courseId,
  name,
  description,
  startDate,
  endDate,
  materialsAfterEnd,
  primaryTrainerName,
  canEdit,
  canDelete,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      try {
        await updateCourseInline(courseId, fd)
        router.refresh()
        setEditing(false)
      } catch {
        setError("Nastala chyba pri ukladaní.")
      }
    })
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("sk")

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Upraviť kurz</h2>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">Názov</label>
          <input
            id="name"
            name="name"
            required
            defaultValue={name}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">Popis</label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            defaultValue={description}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="startDate" className="text-sm font-medium">Začiatok</label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={startDate}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="endDate" className="text-sm font-medium">Koniec</label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              required
              defaultValue={endDate}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="materialsAfterEnd"
            name="materialsAfterEnd"
            type="checkbox"
            defaultChecked={materialsAfterEnd}
            className="h-4 w-4 rounded border"
          />
          <label htmlFor="materialsAfterEnd" className="text-sm">
            Materiály dostupné aj po skončení kurzu
          </label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? "Ukladám…" : "Uložiť"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Zrušiť
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{name}</h1>
        <p className="text-muted-foreground">{description}</p>
        <p className="text-sm text-muted-foreground">
          {fmt(startDate)} – {fmt(endDate)}
          {materialsAfterEnd && " · Materiály dostupné aj po skončení"}
        </p>
        <p className="text-sm text-muted-foreground">
          Hlavný školiteľ: {primaryTrainerName}
        </p>
      </div>
      {canEdit && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Upraviť
          </button>
          {canDelete && <DeleteCourseButton courseId={courseId} />}
        </div>
      )}
    </div>
  )
}
