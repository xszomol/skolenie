import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { updateLesson } from "./actions"
import { UploadForm } from "./_components/UploadForm"
import { DeleteLessonButton } from "./_components/DeleteLessonButton"
import { LessonPages } from "./_components/LessonPages"

type ContentBlock = { type: string; key?: string }

export default async function LessonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; lessonId: string }>
  searchParams: Promise<{ saved?: string }>
}) {
  const { id, lessonId } = await params
  const { saved } = await searchParams
  const session = await auth()
  if (!session) return null

  const roles = session.user.roles ?? []
  const userId = session.user.id

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      pages: { orderBy: { order: "asc" } },
      test: true,
      course: { include: { trainers: true, _count: { select: { participants: true } } } },
    },
  })

  if (!lesson || lesson.courseId !== id) notFound()

  const isAdmin = roles.includes("ADMIN")
  const isCourseTrainer =
    roles.includes("TRAINER") &&
    (lesson.course.primaryTrainerId === userId ||
      lesson.course.trainers.some((t) => t.userId === userId))

  if (!isAdmin && !isCourseTrainer) notFound()

  const completedCount = await prisma.lessonProgress.count({
    where: { lessonId, completedAt: { not: null } },
  })
  const canDelete = completedCount === 0

  const updateAction = updateLesson.bind(null, lessonId)

  return (
    <div className="space-y-8 max-w-3xl">
      {saved === "1" && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Nastavenia lekcie boli uložené.
        </div>
      )}

      {/* Breadcrumb */}
      <p className="text-sm text-muted-foreground">
        <Link href={`/courses/${id}`} className="hover:underline">
          {lesson.course.name}
        </Link>
        {" / "}
        {lesson.name}
      </p>

      {/* Settings */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Nastavenia lekcie</h2>
        <form action={updateAction} className="space-y-4 border rounded-lg p-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">Názov</label>
            <input
              id="name"
              name="name"
              required
              defaultValue={lesson.name}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>

          <div className="flex gap-6 flex-wrap">
            <div className="space-y-2">
              <p className="text-sm font-medium">Typ lekcie</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mandatory"
                    value="true"
                    defaultChecked={lesson.mandatory}
                  />
                  Povinná
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mandatory"
                    value="false"
                    defaultChecked={!lesson.mandatory}
                  />
                  Voliteľná
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="minPageTime" className="text-sm font-medium">
                Min. čas na stránke (s)
              </label>
              <input
                id="minPageTime"
                name="minPageTime"
                type="number"
                min="0"
                defaultValue={lesson.minPageTime}
                className="w-32 border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Uložiť
            </button>
            {canDelete ? (
              <DeleteLessonButton lessonId={lessonId} />
            ) : (
              <span className="text-xs text-muted-foreground">
                Lekciu nie je možné zmazať — {completedCount} účastník(ov) ju dokončil.
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Test */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Test</h2>
          {!lesson.test && (
            <Link
              href={`/courses/${id}/lessons/${lessonId}/test`}
              className="border rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              + Vytvoriť test
            </Link>
          )}
        </div>
        {lesson.test ? (
          <div className="border rounded-lg p-4 flex items-center justify-between">
            <div className="text-sm space-y-0.5">
              {lesson.test.timeLimit && (
                <p className="text-muted-foreground">Časový limit: {Math.round(lesson.test.timeLimit / 60)} min</p>
              )}
              {lesson.test.minPassPercent && (
                <p className="text-muted-foreground">
                  Min. úspešnosť: {lesson.test.minPassPercent} %
                </p>
              )}
              <p className="text-muted-foreground">
                Opakovaní: {lesson.test.maxRetries}
              </p>
            </div>
            <Link
              href={`/courses/${id}/lessons/${lessonId}/test`}
              className="text-sm hover:underline"
            >
              Upraviť test →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">K tejto lekcii neexistuje test.</p>
        )}
      </section>

      {/* Pages */}
      <section className="space-y-4">
        <UploadForm lessonId={lessonId} />

        <LessonPages
          lessonId={lessonId}
          participantCount={lesson.course._count.participants}
          pages={lesson.pages.map((page) => ({
            id: page.id,
            order: page.order,
            title: page.title,
            imageKey: (page.content as ContentBlock[]).find((b) => b.type === "image")?.key ?? null,
          }))}
        />
      </section>
    </div>
  )
}
