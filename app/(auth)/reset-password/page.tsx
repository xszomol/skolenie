import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { GraduationCap } from "lucide-react"
import bcrypt from "bcryptjs"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; error?: string }>
}) {
  const { token, done } = await searchParams

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/60 via-background to-muted/40 p-4">
        <div className="w-full max-w-sm space-y-6">
          <Brand />
          <div className="space-y-5 p-8 bg-card border rounded-xl shadow-lg">
            <p className="text-sm text-muted-foreground">
              Heslo bolo úspešne zmenené. Môžete sa prihlásiť.
            </p>
            <Link
              href="/login"
              className="block w-full text-center bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Prihlásiť sa
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const record = token
    ? await prisma.passwordResetToken.findUnique({
        where: { token },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      })
    : null

  const isValid = record && !record.usedAt && record.expiresAt > new Date()

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/60 via-background to-muted/40 p-4">
        <div className="w-full max-w-sm space-y-6">
          <Brand />
          <div className="space-y-5 p-8 bg-card border rounded-xl shadow-lg">
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              Odkaz je neplatný alebo vypršal. Požiadajte o nový.
            </p>
            <Link
              href="/forgot-password"
              className="block w-full text-center bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Zabudnuté heslo
            </Link>
          </div>
        </div>
      </div>
    )
  }

  async function doReset(formData: FormData) {
    "use server"
    if (!token || !record || !isValid) redirect("/forgot-password")

    const newPassword = formData.get("newPassword")?.toString() ?? ""
    const confirmPassword = formData.get("confirmPassword")?.toString() ?? ""

    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      redirect(`/reset-password?token=${token}&error=1`)
    }

    const fresh = await prisma.passwordResetToken.findUnique({
      where: { token },
      select: { usedAt: true, expiresAt: true, userId: true },
    })
    if (!fresh || fresh.usedAt || fresh.expiresAt <= new Date()) {
      redirect("/forgot-password")
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await prisma.$transaction([
      prisma.user.update({ where: { id: fresh.userId }, data: { passwordHash: hash } }),
      prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
    ])

    redirect("/reset-password?done=1")
  }

  const { error: hasError } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/60 via-background to-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <Brand />
        <div className="space-y-5 p-8 bg-card border rounded-xl shadow-lg">
          <div>
            <h2 className="text-lg font-medium">Nové heslo</h2>
            <p className="text-sm text-muted-foreground mt-1">Zadajte nové heslo (min. 8 znakov).</p>
          </div>

          {hasError && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              Heslá sa nezhodujú alebo sú príliš krátke.
            </p>
          )}

          <form action={doReset} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="text-sm font-medium">Nové heslo</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                autoFocus
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Potvrdiť heslo</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Nastaviť heslo
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <GraduationCap className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-2xl font-semibold">Školenie</h1>
        <p className="text-sm text-muted-foreground">Obnovenie hesla</p>
      </div>
    </div>
  )
}
