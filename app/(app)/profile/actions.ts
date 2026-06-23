"use server"

import { auth, unstable_update } from "@/auth"
import { prisma } from "@/lib/db"
import { sendPasswordChangeConfirmationEmail } from "@/lib/email"
import bcrypt from "bcryptjs"

export type ActionResult = { error: string } | { success: true }

export async function updateProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { error: "Neprihlásený" }

  const firstName = formData.get("firstName")?.toString().trim() ?? ""
  const lastName = formData.get("lastName")?.toString().trim() ?? ""

  if (!firstName || !lastName) return { error: "Meno a priezvisko sú povinné." }
  if (firstName.length > 64 || lastName.length > 64) return { error: "Meno je príliš dlhé." }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { firstName, lastName },
  })

  await unstable_update({ user: { name: `${firstName} ${lastName}` } })

  return { success: true }
}

export async function changePassword(
  _prev: unknown,
  formData: FormData,
): Promise<void> {
  const session = await auth()
  if (!session) throw new Error("Neprihlásený")

  const current = formData.get("currentPassword")?.toString() ?? ""
  const next = formData.get("newPassword")?.toString() ?? ""
  const confirm = formData.get("confirmPassword")?.toString() ?? ""

  if (!current || !next || !confirm) throw new Error("Všetky polia sú povinné.")
  if (next.length < 8) throw new Error("Nové heslo musí mať aspoň 8 znakov.")
  if (next !== confirm) throw new Error("Nové heslá sa nezhodujú.")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, email: true },
  })
  if (!user) throw new Error("Používateľ nenájdený.")

  const valid = await bcrypt.compare(current, user.passwordHash)
  if (!valid) throw new Error("Aktuálne heslo je nesprávne.")

  const newHash = await bcrypt.hash(next, 12)

  // Invalidate previous pending changes
  await prisma.pendingPasswordChange.updateMany({
    where: { userId: session.user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const pending = await prisma.pendingPasswordChange.create({
    data: {
      userId: session.user.id,
      newPasswordHash: newHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  })

  await sendPasswordChangeConfirmationEmail({ to: user.email, token: pending.token })
}
