import { prisma } from "@/lib/db"
import { signIn } from "@/auth"
import { notFound, redirect } from "next/navigation"
import bcrypt from "bcryptjs"

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) notFound()

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { invitedBy: true },
  })

  if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive text-sm">Pozvánka je neplatná alebo vypršala.</p>
      </div>
    )
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  })

  async function register(formData: FormData) {
    "use server"

    const inv = await prisma.invitation.findUnique({ where: { token: token! } })
    if (!inv || inv.usedAt) redirect("/login?error=invalid-token")

    const password = formData.get("password") as string
    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction(async (tx) => {
      let userId: string

      if (existingUser) {
        userId = existingUser.id
        await tx.userRole.upsert({
          where: { userId_role: { userId, role: inv.role } },
          create: { userId, role: inv.role },
          update: {},
        })
      } else {
        const firstName = formData.get("firstName") as string
        const lastName = formData.get("lastName") as string
        const user = await tx.user.create({
          data: {
            email: inv.email,
            firstName,
            lastName,
            passwordHash,
            roles: { create: { role: inv.role } },
          },
        })
        userId = user.id
      }

      if (inv.courseId && inv.role === "PARTICIPANT") {
        await tx.courseParticipant.upsert({
          where: { courseId_userId: { courseId: inv.courseId, userId } },
          create: { courseId: inv.courseId, userId },
          update: {},
        })
      }

      if (inv.courseId && inv.role === "TRAINER") {
        await tx.courseTrainer.upsert({
          where: { courseId_userId: { courseId: inv.courseId, userId } },
          create: { courseId: inv.courseId, userId },
          update: {},
        })
      }

      await tx.invitation.update({ where: { id: inv.id }, data: { usedAt: new Date() } })
    })

    await signIn("credentials", {
      email: inv.email,
      password,
      redirectTo: "/courses",
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-sm space-y-6 p-8 bg-card border rounded-lg shadow-sm">
        <h1 className="text-2xl font-semibold">
          {existingUser ? "Prijať pozvánku" : "Registrácia"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Pozvánka pre: <strong>{invitation.email}</strong>
        </p>

        <form action={register} className="space-y-4">
          {!existingUser && (
            <>
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="text-sm font-medium">Meno</label>
                <input
                  id="firstName"
                  name="firstName"
                  required
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className="text-sm font-medium">Priezvisko</label>
                <input
                  id="lastName"
                  name="lastName"
                  required
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              {existingUser ? "Potvrďte heslom" : "Heslo"}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {existingUser ? "Pridať rolu a prihlásiť sa" : "Zaregistrovať sa"}
          </button>
        </form>
      </div>
    </div>
  )
}
