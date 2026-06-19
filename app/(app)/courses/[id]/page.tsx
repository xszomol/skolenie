import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session) return null

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      primaryTrainer: true,
      trainers: { include: { user: true } },
      participants: { include: { user: true } },
      lessons: { orderBy: { order: "asc" } },
    },
  })

  if (!course) notFound()

  const roles = session.user.roles ?? []
  const userId = session.user.id

  const isAdmin = roles.includes("ADMIN")
  const isTrainer =
    roles.includes("TRAINER") &&
    (course.primaryTrainerId === userId ||
      course.trainers.some((t) => t.userId === userId))
  const isParticipant =
    roles.includes("PARTICIPANT") &&
    course.participants.some((p) => p.userId === userId)

  if (!isAdmin && !isTrainer && !isParticipant) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{course.name}</h1>
        <p className="text-muted-foreground mt-1">{course.description}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {new Date(course.startDate).toLocaleDateString("sk")} –{" "}
          {new Date(course.endDate).toLocaleDateString("sk")}
        </p>
      </div>

      <div className="border rounded-lg p-4 space-y-1 text-sm">
        <p>
          <span className="font-medium">Hlavný školiteľ:</span>{" "}
          {course.primaryTrainer.firstName} {course.primaryTrainer.lastName}
        </p>
        <p>
          <span className="font-medium">Počet účastníkov:</span>{" "}
          {course.participants.length}
        </p>
        <p>
          <span className="font-medium">Počet lekcií:</span>{" "}
          {course.lessons.length}
        </p>
        {course.materialsAfterEnd && (
          <p className="text-muted-foreground">
            Materiály dostupné aj po skončení kurzu
          </p>
        )}
      </div>

      <p className="text-muted-foreground italic text-sm">
        Detail kurzu — v príprave...
      </p>
    </div>
  )
}
