"use client"

import { deleteCourse } from "../actions"

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const action = deleteCourse.bind(null, courseId)
  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm("Naozaj chcete zmazať tento kurz? Akcia je nevratná.")) {
            e.preventDefault()
          }
        }}
        className="border border-destructive text-destructive rounded-md px-3 py-1.5 text-sm hover:bg-destructive/10 transition-colors"
      >
        Zmazať kurz
      </button>
    </form>
  )
}
