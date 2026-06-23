"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { createInvitation } from "@/lib/invitations"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

async function requireTrainerAccess(courseId: string) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const roles = session.user.roles ?? []
  const userId = session.user.id

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new Error("Course not found")

  const isAdmin = roles.includes("ADMIN")
  const isCourseTrainer =
    roles.includes("TRAINER") &&
    (course.primaryTrainerId === userId ||
      !!(await prisma.courseTrainer.findFirst({ where: { courseId, userId } })))

  if (!isAdmin && !isCourseTrainer) throw new Error("Forbidden")

  return { session, course, userId, isPrimaryTrainer: course.primaryTrainerId === userId }
}

export async function updateCourse(courseId: string, formData: FormData) {
  await requireTrainerAccess(courseId)

  await prisma.course.update({
    where: { id: courseId },
    data: {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      startDate: new Date(formData.get("startDate") as string),
      endDate: new Date(formData.get("endDate") as string),
      materialsAfterEnd: formData.get("materialsAfterEnd") === "on",
    },
  })

  redirect(`/courses/${courseId}`)
}

export async function updateCourseInline(courseId: string, formData: FormData) {
  await requireTrainerAccess(courseId)

  const name = (formData.get("name") as string).trim()
  const description = (formData.get("description") as string).trim()
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string

  if (!name || !description || !startDate || !endDate) throw new Error("Všetky polia sú povinné.")

  await prisma.course.update({
    where: { id: courseId },
    data: {
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      materialsAfterEnd: formData.get("materialsAfterEnd") === "on",
    },
  })

  revalidatePath(`/courses/${courseId}`)
}

export async function deleteCourse(courseId: string) {
  await requireTrainerAccess(courseId)

  const confirmed = await prisma.courseParticipant.count({
    where: { courseId, confirmedAt: { not: null } },
  })
  if (confirmed > 0) throw new Error("Cannot delete course with confirmed participants")

  await prisma.course.delete({ where: { id: courseId } })
  redirect("/courses")
}

export async function inviteParticipant(courseId: string, formData: FormData) {
  const { session, course } = await requireTrainerAccess(courseId)
  const email = (formData.get("email") as string).trim().toLowerCase()
  if (!email) throw new Error("Zadajte e-mailovú adresu.")

  const existing = await prisma.user.findUnique({ where: { email }, include: { roles: true } })
  if (existing) {
    const alreadyIn = await prisma.courseParticipant.findUnique({
      where: { courseId_userId: { courseId, userId: existing.id } },
    })
    if (alreadyIn) throw new Error("Tento účastník je už v kurze.")
  }

  await createInvitation({ email, role: "PARTICIPANT", courseId, invitedById: session.user.id })
  revalidatePath(`/courses/${courseId}`)
}

export async function inviteTrainer(courseId: string, formData: FormData) {
  const { session } = await requireTrainerAccess(courseId)
  const email = (formData.get("email") as string).trim().toLowerCase()
  if (!email) throw new Error("Zadajte e-mailovú adresu.")

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    const alreadyIn = await prisma.courseTrainer.findUnique({
      where: { courseId_userId: { courseId, userId: existing.id } },
    })
    if (alreadyIn) throw new Error("Tento školiteľ je už v kurze.")
  }

  await createInvitation({ email, role: "TRAINER", courseId, invitedById: session.user.id })
  revalidatePath(`/courses/${courseId}`)
}

export async function removeParticipant(courseId: string, participantId: string) {
  await requireTrainerAccess(courseId)

  const p = await prisma.courseParticipant.findUnique({
    where: { courseId_userId: { courseId, userId: participantId } },
  })
  if (p?.confirmedAt) throw new Error("Cannot remove a confirmed participant")

  await prisma.courseParticipant.delete({
    where: { courseId_userId: { courseId, userId: participantId } },
  })
  revalidatePath(`/courses/${courseId}`)
}

export async function removeTrainer(courseId: string, trainerId: string) {
  const { isPrimaryTrainer } = await requireTrainerAccess(courseId)
  if (!isPrimaryTrainer) throw new Error("Only the primary trainer can remove trainers")

  await prisma.courseTrainer.delete({
    where: { courseId_userId: { courseId, userId: trainerId } },
  })
  revalidatePath(`/courses/${courseId}`)
}

export async function setPrimaryTrainer(courseId: string, trainerId: string) {
  const { isPrimaryTrainer } = await requireTrainerAccess(courseId)
  if (!isPrimaryTrainer) throw new Error("Only the primary trainer can change this")

  await prisma.course.update({ where: { id: courseId }, data: { primaryTrainerId: trainerId } })
  revalidatePath(`/courses/${courseId}`)
}

export async function reorderLessons(courseId: string, orderedIds: string[]) {
  await requireTrainerAccess(courseId)

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.lesson.update({ where: { id }, data: { order: index + 1 } })
    )
  )

  revalidatePath(`/courses/${courseId}`)
}
