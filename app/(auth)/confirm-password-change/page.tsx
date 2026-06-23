import { prisma } from "@/lib/db"
import Link from "next/link"
import { GraduationCap, CheckCircle2, XCircle } from "lucide-react"

export default async function ConfirmPasswordChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  const record = token
    ? await prisma.pendingPasswordChange.findUnique({
        where: { token },
        select: { id: true, userId: true, newPasswordHash: true, expiresAt: true, usedAt: true },
      })
    : null

  const isValid = record && !record.usedAt && record.expiresAt > new Date()

  let success = false
  if (isValid) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: record.newPasswordHash },
      }),
      prisma.pendingPasswordChange.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ])
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
                  <p className="text-sm font-medium">Heslo bolo úspešne zmenené.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Môžete sa prihlásiť novým heslom.</p>
                </div>
              </div>
              <Link
                href="/profile"
                className="block w-full text-center bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Späť na profil
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium">Odkaz je neplatný alebo vypršal.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Požiadajte o novú zmenu hesla v profile.</p>
                </div>
              </div>
              <Link
                href="/profile"
                className="block w-full text-center bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Späť na profil
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
