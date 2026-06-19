"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { createInvitation, parseEmails } from "@/lib/invitations"
import { redirect } from "next/navigation"

export async function createCourse(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const roles = session.user.roles ?? []
  if (!roles.some((r) => ["ADMIN", "TRAINER"].includes(r))) throw new Error("Forbidden")

  const isTrainer = roles.includes("TRAINER")

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const startDate = new Date(formData.get("startDate") as string)
  const endDate = new Date(formData.get("endDate") as string)
  const materialsAfterEnd = formData.get("materialsAfterEnd") === "on"
  const participantEmails = parseEmails(formData.get("participantEmails") as string)
  const trainerEmails = parseEmails(formData.get("trainerEmails") as string)

  const primaryTrainerId = isTrainer
    ? session.user.id
    : (formData.get("primaryTrainerId") as string)

  if (!primaryTrainerId) throw new Error("Primary trainer is required")

  const course = await prisma.course.create({
    data: {
      name,
      description,
      startDate,
      endDate,
      materialsAfterEnd,
      createdById: session.user.id,
      primaryTrainerId,
      trainers: { create: { userId: primaryTrainerId } },
    },
  })

  await Promise.all([
    ...participantEmails.map((email) =>
      createInvitation({
        email,
        role: "PARTICIPANT",
        courseId: course.id,
        invitedById: session.user.id,
      })
    ),
    ...trainerEmails.map((email) =>
      createInvitation({
        email,
        role: "TRAINER",
        courseId: course.id,
        invitedById: session.user.id,
      })
    ),
  ])

  redirect(`/courses/${course.id}`)
}
