import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { updateCourse } from "../actions"

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")

  const roles = session.user.roles ?? []
  const userId = session.user.id

  const course = await prisma.course.findUnique({ where: { id } })
  if (!course) notFound()

  const isAdmin = roles.includes("ADMIN")
  const isTrainer =
    roles.includes("TRAINER") &&
    (course.primaryTrainerId === userId ||
      !!(await prisma.courseTrainer.findFirst({ where: { courseId: id, userId } })))

  if (!isAdmin && !isTrainer) notFound()

  const action = updateCourse.bind(null, id)

  const fmt = (d: Date) => d.toISOString().split("T")[0]

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Upraviť školenie</h1>

      <form action={action} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">Názov *</label>
          <input
            id="name"
            name="name"
            required
            defaultValue={course.name}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">Popis *</label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            defaultValue={course.description}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="startDate" className="text-sm font-medium">Dátum začiatku *</label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={fmt(course.startDate)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="endDate" className="text-sm font-medium">Dátum konca *</label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              required
              defaultValue={fmt(course.endDate)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="materialsAfterEnd"
            name="materialsAfterEnd"
            type="checkbox"
            defaultChecked={course.materialsAfterEnd}
            className="h-4 w-4 rounded border"
          />
          <label htmlFor="materialsAfterEnd" className="text-sm">
            Materiály dostupné aj po skončení kurzu
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Uložiť
          </button>
          <Link
            href={`/courses/${id}`}
            className="rounded-md px-6 py-2 text-sm border hover:bg-muted transition-colors"
          >
            Zrušiť
          </Link>
        </div>
      </form>
    </div>
  )
}
