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

  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`)
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

export async function movePage(lessonId: string, pageId: string, direction: "up" | "down") {
  const { courseId } = await requireLessonTrainerAccess(lessonId)

  const pages = await prisma.lessonPage.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
  })

  const idx = pages.findIndex((p) => p.id === pageId)
  if (idx === -1) return

  const swapIdx = direction === "up" ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= pages.length) return

  const a = pages[idx]
  const b = pages[swapIdx]

  await prisma.$transaction([
    prisma.lessonPage.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.lessonPage.update({ where: { id: b.id }, data: { order: a.order } }),
  ])

  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`)
}

export async function deletePage(lessonId: string, pageId: string) {
  const { courseId } = await requireLessonTrainerAccess(lessonId)

  await prisma.lessonPage.delete({ where: { id: pageId } })

  // Re-number remaining pages
  const remaining = await prisma.lessonPage.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
  })
  await Promise.all(
    remaining.map((p, i) =>
      prisma.lessonPage.update({ where: { id: p.id }, data: { order: i + 1 } })
    )
  )

  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`)
}
