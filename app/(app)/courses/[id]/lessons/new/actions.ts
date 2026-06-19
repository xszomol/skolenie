"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

export async function createLesson(courseId: string, formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const roles = session.user.roles ?? []
  const userId = session.user.id

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { trainers: true },
  })
  if (!course) throw new Error("Course not found")

  const isAdmin = roles.includes("ADMIN")
  const isCourseTrainer =
    roles.includes("TRAINER") &&
    (course.primaryTrainerId === userId || course.trainers.some((t) => t.userId === userId))

  if (!isAdmin && !isCourseTrainer) throw new Error("Forbidden")

  const last = await prisma.lesson.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
  })

  const lesson = await prisma.lesson.create({
    data: {
      courseId,
      name: formData.get("name") as string,
      mandatory: formData.get("mandatory") !== "false",
      minPageTime: Math.max(0, parseInt(formData.get("minPageTime") as string) || 30),
      order: (last?.order ?? 0) + 1,
    },
  })

  redirect(`/courses/${courseId}/lessons/${lesson.id}`)
}
