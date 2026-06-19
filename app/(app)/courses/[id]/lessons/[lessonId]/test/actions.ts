"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function requireAccess(lessonId: string) {
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
  return { lesson, courseId: lesson.courseId }
}

function revalidate(courseId: string, lessonId: string) {
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}/test`)
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`)
}

export async function upsertTestSettings(lessonId: string, formData: FormData) {
  const { lesson, courseId } = await requireAccess(lessonId)

  const introText = (formData.get("introText") as string) || null
  const timeLimit = formData.get("timeLimit") ? parseInt(formData.get("timeLimit") as string) * 60 : null
  const minPassPercent = formData.get("minPassPercent") ? parseInt(formData.get("minPassPercent") as string) : null
  const maxRetries = parseInt((formData.get("maxRetries") as string) ?? "0") || 0
  const randomOrder = formData.get("randomOrder") === "true"

  await prisma.test.upsert({
    where: { lessonId },
    create: { lessonId, introText, timeLimit, minPassPercent, maxRetries, randomOrder },
    update: { introText, timeLimit, minPassPercent, maxRetries, randomOrder },
  })

  revalidate(courseId, lessonId)
}

export async function deleteTest(lessonId: string) {
  const { courseId } = await requireAccess(lessonId)
  await prisma.test.delete({ where: { lessonId } })
  redirect(`/courses/${courseId}/lessons/${lessonId}`)
}

export async function addQuestion(testId: string, lessonId: string) {
  await requireAccess(lessonId)

  const last = await prisma.question.findFirst({
    where: { testId },
    orderBy: { order: "desc" },
  })
  const order = (last?.order ?? 0) + 1

  const q = await prisma.question.create({
    data: { testId, text: "", points: 1, order },
  })
  return { id: q.id, order: q.order }
}

export async function updateQuestion(
  questionId: string,
  lessonId: string,
  data: { text: string; points: number; answers: { id?: string; text: string; isCorrect: boolean }[] }
) {
  const { courseId } = await requireAccess(lessonId)

  await prisma.$transaction(async (tx) => {
    await tx.question.update({
      where: { id: questionId },
      data: { text: data.text, points: data.points },
    })
    await tx.answer.deleteMany({ where: { questionId } })
    if (data.answers.length > 0) {
      await tx.answer.createMany({
        data: data.answers.map((a) => ({
          questionId,
          text: a.text,
          isCorrect: a.isCorrect,
        })),
      })
    }
  })

  revalidate(courseId, lessonId)
}

export async function deleteQuestion(questionId: string, lessonId: string) {
  const { courseId } = await requireAccess(lessonId)

  const q = await prisma.question.findUnique({ where: { id: questionId } })
  if (!q) return
  await prisma.question.delete({ where: { id: questionId } })

  // Renumber remaining
  const rest = await prisma.question.findMany({
    where: { testId: q.testId },
    orderBy: { order: "asc" },
  })
  await Promise.all(
    rest.map((r, i) => prisma.question.update({ where: { id: r.id }, data: { order: i + 1 } }))
  )

  revalidate(courseId, lessonId)
}

export async function moveQuestion(
  testId: string,
  questionId: string,
  direction: "up" | "down",
  lessonId: string
) {
  const { courseId } = await requireAccess(lessonId)

  const questions = await prisma.question.findMany({
    where: { testId },
    orderBy: { order: "asc" },
  })
  const idx = questions.findIndex((q) => q.id === questionId)
  if (idx === -1) return
  const swapIdx = direction === "up" ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= questions.length) return

  const a = questions[idx]
  const b = questions[swapIdx]
  await prisma.$transaction([
    prisma.question.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.question.update({ where: { id: b.id }, data: { order: a.order } }),
  ])

  revalidate(courseId, lessonId)
}
