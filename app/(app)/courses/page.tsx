import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"

const courseInclude = {
  primaryTrainer: true,
  _count: { select: { participants: true } },
} as const

export default async function CoursesPage() {
  const session = await auth()
  if (!session) return null

  const roles = session.user.roles ?? []
  const userId = session.user.id

  const [adminCourses, trainerCourses, participantCourses] = await Promise.all([
    roles.includes("ADMIN")
      ? prisma.course.findMany({ include: courseInclude, orderBy: { startDate: "desc" } })
      : [],
    roles.includes("TRAINER")
      ? prisma.course.findMany({
          where: { OR: [{ primaryTrainerId: userId }, { trainers: { some: { userId } } }] },
          include: courseInclude,
          orderBy: { startDate: "desc" },
        })
      : [],
    roles.includes("PARTICIPANT")
      ? prisma.course.findMany({
          where: { participants: { some: { userId } } },
          include: courseInclude,
          orderBy: { startDate: "desc" },
        })
      : [],
  ])

  const isTrainerOrAdmin = roles.some((r) => ["ADMIN", "TRAINER"].includes(r))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kurzy</h1>
        {isTrainerOrAdmin && (
          <Link
            href="/courses/new"
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Nový kurz
          </Link>
        )}
      </div>

      {roles.includes("ADMIN") && (
        <CourseSection title="Admin" courses={adminCourses} />
      )}
      {roles.includes("TRAINER") && (
        <CourseSection title="Školiteľ" courses={trainerCourses} />
      )}
      {roles.includes("PARTICIPANT") && (
        <CourseSection title="Účastník" courses={participantCourses} />
      )}
    </div>
  )
}

type CourseWithMeta = {
  id: string
  name: string
  startDate: Date
  endDate: Date
  primaryTrainer: { firstName: string; lastName: string }
  _count: { participants: number }
}

function CourseSection({
  title,
  courses,
}: {
  title: string
  courses: CourseWithMeta[]
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium border-b pb-2">{title}</h2>
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Žiadne kurzy</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors space-y-2"
            >
              <h3 className="font-medium">{course.name}</h3>
              <p className="text-sm text-muted-foreground">
                {course.primaryTrainer.firstName} {course.primaryTrainer.lastName}
              </p>
              <div className="text-xs text-muted-foreground flex gap-4">
                <span>{course._count.participants} účastníkov</span>
                <span>
                  {new Date(course.startDate).toLocaleDateString("sk")} –{" "}
                  {new Date(course.endDate).toLocaleDateString("sk")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
