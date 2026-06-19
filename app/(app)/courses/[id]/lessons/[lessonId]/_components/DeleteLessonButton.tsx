"use client"

import { deleteLesson } from "../actions"

export function DeleteLessonButton({ lessonId }: { lessonId: string }) {
  const action = deleteLesson.bind(null, lessonId)
  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm("Naozaj zmazať túto lekciu? Akcia je nevratná.")) {
            e.preventDefault()
          }
        }}
        className="text-sm text-destructive hover:underline"
      >
        Zmazať lekciu
      </button>
    </form>
  )
}
