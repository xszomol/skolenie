"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function requireLessonTrainerAccess(lessonId: string) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { include: { trainers: true } } },
  })
  if (!lesson) throw new Error("Not found")

  const roles = session.user.roles ?? []
  const userId = session.user.id
  const isAdmin = roles.includes("ADMIN")
  const isCourseTrainer =
    roles.includes("TRAINER") &&
    (lesson.course.primaryTrainerId === userId ||
      lesson.course.trainers.some((t) => t.userId === userId))

  if (!isAdmin && !isCourseTrainer) throw new Error("Forbidden")

  return { session, lesson, courseId: lesson.courseId }
}

export async function updateLesson(lessonId: string, formData: FormData) {
  const { courseId } = await requireLessonTrainerAccess(lessonId)

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      name: formData.get("name") as string,
      mandatory: formData.get("mandatory") !== "false",
      minPageTime: Math.max(0, parseInt(formData.get("minPageTime") as string) || 30),
    },
  })

  redirect(`/courses/${courseId}/lessons/${lessonId}?saved=1`)
}

export async function deleteLesson(lessonId: string) {
  const { courseId } = await requireLessonTrainerAccess(lessonId)

  const completed = await prisma.lessonProgress.count({
    where: { lessonId, completedAt: { not: null } },
  })
  if (completed > 0) throw new Error("Cannot delete a lesson that participants have completed")

  await prisma.lesson.delete({ where: { id: lessonId } })
  redirect(`/courses/${courseId}`)
}

export async function updatePageTitle(lessonId: string, pageId: string, title: string) {
  await requireLessonTrainerAccess(lessonId)

  await prisma.lessonPage.update({
    where: { id: pageId },
    data: { title: title.trim() || null },
  })
}

export async function updatePageContent(lessonId: string, pageId: string, content: unknown[]) {
  await requireLessonTrainerAccess(lessonId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.lessonPage.update({ where: { id: pageId }, data: { content: content as any } })
}

export async function addBlankPage(lessonId: string) {
  const { courseId } = await requireLessonTrainerAccess(lessonId)

  const count = await prisma.lessonPage.count({ where: { lessonId } })
  await prisma.lessonPage.create({
    data: { lessonId, order: count + 1, content: [] },
  })

  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`)
}

export async function reorderPages(lessonId: string, orderedIds: string[]) {
  const { courseId } = await requireLessonTrainerAccess(lessonId)

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.lessonPage.update({ where: { id }, data: { order: index + 1 } })
    )
  )

  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`)
}

export async function deletePage(lessonId: string, pageId: string) {
  const { courseId } = await requireLessonTrainerAccess(lessonId)

  await prisma.lessonPage.delete({ where: { id: pageId } })

  await renumberPages(lessonId)
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`)
}

export async function deletePages(lessonId: string, pageIds: string[]) {
  if (pageIds.length === 0) return
  const { courseId } = await requireLessonTrainerAccess(lessonId)

  await prisma.lessonPage.deleteMany({ where: { id: { in: pageIds }, lessonId } })

  await renumberPages(lessonId)
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`)
}

async function renumberPages(lessonId: string) {
  const remaining = await prisma.lessonPage.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
  })
  await Promise.all(
    remaining.map((p, i) =>
      prisma.lessonPage.update({ where: { id: p.id }, data: { order: i + 1 } })
    )
  )
}
