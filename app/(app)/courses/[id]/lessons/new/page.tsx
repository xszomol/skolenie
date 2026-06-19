import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createLesson } from "./actions"

export default async function NewLessonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")

  const roles = session.user.roles ?? []
  const userId = session.user.id

  const course = await prisma.course.findUnique({
    where: { id },
    include: { trainers: true },
  })
  if (!course) notFound()

  const isAdmin = roles.includes("ADMIN")
  const isCourseTrainer =
    roles.includes("TRAINER") &&
    (course.primaryTrainerId === userId || course.trainers.some((t) => t.userId === userId))

  if (!isAdmin && !isCourseTrainer) redirect("/courses")

  const action = createLesson.bind(null, id)

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          <Link href={`/courses/${id}`} className="hover:underline">{course.name}</Link>
        </p>
        <h1 className="text-2xl font-semibold">Nová lekcia</h1>
      </div>

      <form action={action} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">Názov lekcie *</label>
          <input
            id="name"
            name="name"
            required
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Typ lekcie</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mandatory" value="true" defaultChecked />
              Povinná
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mandatory" value="false" />
              Voliteľná
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="minPageTime" className="text-sm font-medium">
            Minimálny čas na stránke (sekundy)
          </label>
          <input
            id="minPageTime"
            name="minPageTime"
            type="number"
            min="0"
            defaultValue={30}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Účastník musí stráviť aspoň tento čas na každej stránke pred posunom ďalej.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Vytvoriť lekciu
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
