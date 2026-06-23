"use client"

import { useState } from "react"
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
import { GripVertical } from "lucide-react"
import Link from "next/link"
import { reorderLessons } from "../actions"

export type LessonItem = {
  id: string
  name: string
  mandatory: boolean
  hasTest: boolean
  completedCount: number
}

function SortableLesson({
  lesson,
  courseId,
  participantCount,
}: {
  lesson: LessonItem
  courseId: string
  participantCount: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 px-4 py-3 transition-colors ${
        isDragging ? "bg-muted shadow-md relative z-10" : "hover:bg-muted/50"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 p-0.5 -ml-0.5"
        aria-label="Presunúť lekciu"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Link
        href={`/courses/${courseId}/lessons/${lesson.id}`}
        className="flex flex-1 items-center justify-between gap-4 min-w-0 group"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium group-hover:text-primary transition-colors">
            {lesson.name}
          </span>
          {!lesson.mandatory && (
            <span className="text-xs border rounded px-1.5 py-0.5 text-muted-foreground">
              voliteľná
            </span>
          )}
          {lesson.hasTest && (
            <span className="text-xs border rounded px-1.5 py-0.5 text-muted-foreground">
              test
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {lesson.completedCount}/{participantCount} dokončili
        </span>
      </Link>
    </div>
  )
}

export function SortableLessonList({
  lessons,
  courseId,
  participantCount,
}: {
  lessons: LessonItem[]
  courseId: string
  participantCount: number
}) {
  const [items, setItems] = useState(lessons)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((l) => l.id === active.id)
    const newIndex = items.findIndex((l) => l.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)

    setItems(reordered)
    await reorderLessons(courseId, reordered.map((l) => l.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="border rounded-lg divide-y overflow-hidden">
          {items.map((lesson) => (
            <SortableLesson
              key={lesson.id}
              lesson={lesson}
              courseId={courseId}
              participantCount={participantCount}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
