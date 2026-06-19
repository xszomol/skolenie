import { Role } from "@prisma/client"
import { prisma } from "./db"
import { sendInvitationEmail } from "./email"

export async function createInvitation({
  email,
  role,
  courseId,
  invitedById,
}: {
  email: string
  role: Role
  courseId?: string
  invitedById: string
}) {
  const inviter = await prisma.user.findUnique({ where: { id: invitedById } })
  if (!inviter) throw new Error("Inviter not found")

  const invitation = await prisma.invitation.create({
    data: {
      email,
      role,
      courseId,
      invitedById,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  await sendInvitationEmail({
    to: email,
    inviterName: `${inviter.firstName} ${inviter.lastName}`,
    role,
    token: invitation.token,
  })

  return invitation
}

export function parseEmails(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(/[\n,;]/)
    .map((e) => e.trim())
    .filter((e) => e.includes("@"))
}
