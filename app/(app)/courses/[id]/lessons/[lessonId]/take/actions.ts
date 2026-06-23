"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

async function requireParticipantAccess(lessonId: string) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      pages: { select: { id: true } },
      course: { include: { participants: true } },
    },
  })
  if (!lesson) throw new Error("Not found")

  const userId = session.user.id
  const roles = session.user.roles ?? []
  const isParticipant =
    roles.includes("PARTICIPANT") &&
    lesson.course.participants.some((p) => p.userId === userId)
  if (!isParticipant) throw new Error("Forbidden")

  return { userId, lesson, courseId: lesson.courseId }
}

/**
 * Record time spent on a page. Marks the page completed once the minimum
 * required time has been reached. Time is monotonic (never decreases).
 */
export async function recordPage(lessonId: string, pageId: string, secondsSpent: number) {
  const { userId, lesson } = await requireParticipantAccess(lessonId)
  if (!lesson.pages.some((p) => p.id === pageId)) throw new Error("Page not in lesson")

  const existing = await prisma.lessonPageProgress.findUnique({
    where: { userId_pageId: { userId, pageId } },
  })

  const timeSpent = Math.max(existing?.timeSpent ?? 0, Math.floor(secondsSpent))
  const reachedMin = timeSpent >= lesson.minPageTime
  const completedAt = existing?.completedAt ?? (reachedMin ? new Date() : null)

  await prisma.lessonPageProgress.upsert({
    where: { userId_pageId: { userId, pageId } },
    create: { userId, pageId, timeSpent, completedAt },
    update: { timeSpent, completedAt },
  })
}

/**
 * Mark the whole lesson as completed (called once every page is done).
 */
export async function completeLesson(lessonId: string) {
  const { userId, lesson, courseId } = await requireParticipantAccess(lessonId)

  const completedPages = await prisma.lessonPageProgress.count({
    where: { userId, completedAt: { not: null }, page: { lessonId } },
  })
  if (completedPages < lesson.pages.length) {
    throw new Error("Not all pages completed")
  }

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, completedAt: new Date() },
    update: { completedAt: new Date() },
  })

  revalidatePath(`/courses/${courseId}`)
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/take`)
}
