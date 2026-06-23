import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { LessonViewer } from "./_components/LessonViewer"

import { parseContent, type ImageBlock } from "@/types/content"

export default async function LessonTakePage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>
}) {
  const { id, lessonId } = await params
  const session = await auth()
  if (!session) return null

  const userId = session.user.id
  const roles = session.user.roles ?? []

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      pages: { orderBy: { order: "asc" } },
      test: { select: { id: true } },
      course: { include: { participants: true } },
    },
  })

  if (!lesson || lesson.courseId !== id) notFound()

  const isParticipant =
    roles.includes("PARTICIPANT") && lesson.course.participants.some((p) => p.userId === userId)
  if (!isParticipant) notFound()

  const pageProgress = await prisma.lessonPageProgress.findMany({
    where: { userId, page: { lessonId } },
    select: { pageId: true, completedAt: true },
  })
  const completedPageIds = pageProgress.filter((p) => p.completedAt).map((p) => p.pageId)

  return (
    <LessonViewer
      courseId={id}
      courseName={lesson.course.name}
      lessonId={lessonId}
      lessonName={lesson.name}
      minPageTime={lesson.minPageTime}
      hasTest={!!lesson.test}
      completedPageIds={completedPageIds}
      pages={lesson.pages.map((p) => {
        const blocks = parseContent(p.content)
        return {
          id: p.id,
          title: p.title,
          imageKey: blocks.find((b): b is ImageBlock => b.type === "image")?.key ?? null,
          textBlocks: blocks.filter((b) => b.type !== "image"),
        }
      })}
    />
  )
}
