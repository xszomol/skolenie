import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { parseContent } from "@/types/content"
import { PageContentEditor } from "./_components/PageContentEditor"

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string; pageId: string }>
}) {
  const { id, lessonId, pageId } = await params
  const session = await auth()
  if (!session) return null

  const roles = session.user.roles ?? []
  const userId = session.user.id

  const page = await prisma.lessonPage.findUnique({
    where: { id: pageId },
    include: {
      lesson: {
        include: { course: { include: { trainers: true } } },
      },
    },
  })

  if (!page || page.lessonId !== lessonId || page.lesson.courseId !== id) notFound()

  const isAdmin = roles.includes("ADMIN")
  const isCourseTrainer =
    roles.includes("TRAINER") &&
    (page.lesson.course.primaryTrainerId === userId ||
      page.lesson.course.trainers.some((t) => t.userId === userId))

  if (!isAdmin && !isCourseTrainer) notFound()

  const content = parseContent(page.content)
  const backHref = `/courses/${id}/lessons/${lessonId}`

  return (
    <div className="max-w-3xl">
      <PageContentEditor
        pageId={pageId}
        lessonId={lessonId}
        initialContent={content}
        initialTitle={page.title}
        pageOrder={page.order}
        backHref={backHref}
        lessonName={page.lesson.name}
        pageDisplayTitle={page.title ?? `Stránka ${page.order}`}
      />
    </div>
  )
}
