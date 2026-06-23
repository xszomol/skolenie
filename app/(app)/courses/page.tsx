import { Suspense } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { BookOpen, Users, CalendarDays, Plus, FolderOpen } from "lucide-react"
import { CourseFilters } from "./_components/CourseFilters"

const courseInclude = {
  primaryTrainer: true,
  _count: { select: { participants: true, lessons: true } },
} as const

type CourseStatus = "active" | "upcoming" | "finished"
type UserRole = "ADMIN" | "TRAINER" | "PARTICIPANT"

function getCourseStatus(startDate: Date, endDate: Date): CourseStatus {
  const now = new Date()
  if (now < new Date(startDate)) return "upcoming"
  if (now > new Date(endDate)) return "finished"
  return "active"
}

const statusConfig: Record<CourseStatus, { label: string; badge: string; dot: string; opacity: string }> = {
  active:   { label: "Prebieha",  badge: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300", dot: "bg-green-500", opacity: "" },
  upcoming: { label: "Plánovaný", badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",     dot: "bg-blue-400",  opacity: "" },
  finished: { label: "Ukončený",  badge: "bg-gray-100 text-gray-500 dark:bg-gray-500/15 dark:text-gray-400",     dot: "bg-gray-400",  opacity: "opacity-75" },
}

const roleConfig: Record<UserRole, { label: string; chip: string }> = {
  ADMIN:       { label: "Admin",     chip: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300" },
  TRAINER:     { label: "Školiteľ",  chip: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
  PARTICIPANT: { label: "Účastník",  chip: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" },
}

const STATUS_ORDER: CourseStatus[] = ["active", "upcoming", "finished"]

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[]; status?: string | string[]; q?: string }>
}) {
  const session = await auth()
  if (!session) return null

  const roles = session.user.roles ?? []
  const userId = session.user.id

  const [adminCourses, trainerCourses, participantCourses] = await Promise.all([
    roles.includes("ADMIN")
      ? prisma.course.findMany({ include: courseInclude })
      : [],
    roles.includes("TRAINER")
      ? prisma.course.findMany({
          where: { OR: [{ primaryTrainerId: userId }, { trainers: { some: { userId } } }] },
          include: courseInclude,
        })
      : [],
    roles.includes("PARTICIPANT")
      ? prisma.course.findMany({
          where: { participants: { some: { userId } } },
          include: courseInclude,
        })
      : [],
  ])

  // Merge into a single deduplicated map: courseId → { course, userRoles[] }
  type CourseEntry = {
    course: typeof adminCourses[number]
    userRoles: UserRole[]
  }
  const courseMap = new Map<string, CourseEntry>()

  for (const c of adminCourses) {
    courseMap.set(c.id, { course: c, userRoles: ["ADMIN"] })
  }
  for (const c of trainerCourses) {
    const entry = courseMap.get(c.id)
    if (entry) entry.userRoles.push("TRAINER")
    else courseMap.set(c.id, { course: c, userRoles: ["TRAINER"] })
  }
  for (const c of participantCourses) {
    const entry = courseMap.get(c.id)
    if (entry) entry.userRoles.push("PARTICIPANT")
    else courseMap.set(c.id, { course: c, userRoles: ["PARTICIPANT"] })
  }

  let entries = Array.from(courseMap.values()).sort((a, b) => {
    const sa = getCourseStatus(a.course.startDate, a.course.endDate)
    const sb = getCourseStatus(b.course.startDate, b.course.endDate)
    if (sa !== sb) return STATUS_ORDER.indexOf(sa) - STATUS_ORDER.indexOf(sb)
    return new Date(b.course.startDate).getTime() - new Date(a.course.startDate).getTime()
  })

  // Apply filters from URL
  const { role: roleParam, status: statusParam, q } = await searchParams
  const roleFilter = asArray(roleParam)
  const statusFilter = asArray(statusParam)
  const searchQuery = q?.trim().toLowerCase() ?? ""

  if (searchQuery) {
    entries = entries.filter(({ course }) =>
      course.name.toLowerCase().includes(searchQuery)
    )
  }
  if (roleFilter.length > 0) {
    entries = entries.filter(({ userRoles }) =>
      userRoles.some((r) => roleFilter.includes(r))
    )
  }
  if (statusFilter.length > 0) {
    entries = entries.filter(({ course }) =>
      statusFilter.includes(getCourseStatus(course.startDate, course.endDate))
    )
  }

  const isTrainerOrAdmin = roles.some((r) => ["ADMIN", "TRAINER"].includes(r))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Kurzy</h1>
        {isTrainerOrAdmin && (
          <Link
            href="/courses/new"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Nový kurz
          </Link>
        )}
      </div>

      <Suspense>
        <CourseFilters availableRoles={roles} />
      </Suspense>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-3 py-16 border border-dashed rounded-xl bg-card/50">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FolderOpen className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted-foreground">Žiadne kurzy nezodpovedajú filtru.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(({ course, userRoles }) => {
            const status = getCourseStatus(course.startDate, course.endDate)
            const cfg = statusConfig[status]
            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className={`group flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all ${cfg.opacity}`}
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                    <h3 className="font-semibold leading-snug truncate group-hover:text-primary transition-colors">
                      {course.name}
                    </h3>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Trainer */}
                <p className="text-sm text-muted-foreground -mt-1">
                  {course.primaryTrainer.firstName} {course.primaryTrainer.lastName}
                </p>

                {/* Metrics */}
                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      {course._count.lessons} lekcií
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {course._count.participants} účastníkov
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(course.startDate).toLocaleDateString("sk")} –{" "}
                    {new Date(course.endDate).toLocaleDateString("sk")}
                  </span>
                </div>

                {/* Role chips */}
                <div className="flex gap-1.5 flex-wrap mt-auto border-t border-border/60 pt-3">
                  {userRoles.map((role) => (
                    <span
                      key={role}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleConfig[role].chip}`}
                    >
                      {roleConfig[role].label}
                    </span>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
