"use client"

import { useTransition } from "react"
import { deleteLesson } from "../actions"

export function DeleteLessonButton({ lessonId }: { lessonId: string }) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm("Naozaj zmazať túto lekciu? Akcia je nevratná.")) return
    startTransition(() => { deleteLesson(lessonId) })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-sm text-destructive hover:underline disabled:opacity-50"
    >
      {pending ? "Mažem…" : "Zmazať lekciu"}
    </button>
  )
}
