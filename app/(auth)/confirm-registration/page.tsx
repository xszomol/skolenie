import { prisma } from "@/lib/db"
import Link from "next/link"
import { GraduationCap, CheckCircle2, XCircle } from "lucide-react"

export default async function ConfirmRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  const record = token
    ? await prisma.pendingTrainerRegistration.findUnique({
        where: { token },
        select: { id: true, email: true, firstName: true, lastName: true, passwordHash: true, expiresAt: true, usedAt: true },
      })
    : null

  const isValid = record && !record.usedAt && record.expiresAt > new Date()

  let success = false
  if (isValid) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: record.email } })
      if (!existing) {
        await tx.user.create({
          data: {
            email: record.email,
            firstName: record.firstName,
            lastName: record.lastName,
            passwordHash: record.passwordHash,
            roles: { create: { role: "TRAINER" } },
          },
        })
      } else {
        await tx.userRole.upsert({
          where: { userId_role: { userId: existing.id, role: "TRAINER" } },
          create: { userId: existing.id, role: "TRAINER" },
          update: {},
        })
      }
      await tx.pendingTrainerRegistration.update({
        where: { token },
        data: { usedAt: new Date() },
      })
    })
    success = true
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/60 via-background to-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-semibold">Školenie</h1>
        </div>

        <div className="p-8 bg-card border rounded-xl shadow-lg space-y-5">
          {success ? (
            <>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Registrácia bola úspešne potvrdená.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Môžete sa prihlásiť ako školiteľ.</p>
                </div>
              </div>
              <Link
                href="/login"
                className="block w-full text-center bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Prihlásiť sa
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium">Odkaz je neplatný alebo vypršal.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Zaregistrujte sa znova.</p>
                </div>
              </div>
              <Link
                href="/register"
                className="block w-full text-center bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Späť na registráciu
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
