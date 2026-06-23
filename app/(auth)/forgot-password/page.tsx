import { prisma } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"
import { checkRateLimit } from "@/lib/rate-limit"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { GraduationCap } from "lucide-react"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>
}) {
  const { sent } = await searchParams

  async function requestReset(formData: FormData) {
    "use server"
    const email = formData.get("email")?.toString().trim().toLowerCase() ?? ""
    if (!email) redirect("/forgot-password")

    // Per-IP rate limit: 5 requests per 15 minutes
    const headersList = await headers()
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
      headersList.get("x-real-ip") ??
      "unknown"
    if (!checkRateLimit(`fp:${ip}`, 5, 15 * 60 * 1000)) {
      redirect("/forgot-password?sent=1")
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (user) {
      // Per-email cooldown: don't send another email within 10 minutes
      const recentToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
        select: { id: true },
      })
      if (!recentToken) {
        await prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        })
        const resetToken = await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        })
        await sendPasswordResetEmail({ to: email, token: resetToken.token }).catch(() => {})
      }
    }

    // Always redirect to the same confirmation page — never reveal whether
    // the email exists or whether a cooldown is active.
    redirect("/forgot-password?sent=1")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/60 via-background to-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Školenie</h1>
            <p className="text-sm text-muted-foreground">Obnovenie hesla</p>
          </div>
        </div>

        <div className="space-y-5 p-8 bg-card border rounded-xl shadow-lg">
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ak zadaný e-mail existuje v systéme, bol naň odoslaný odkaz na obnovenie hesla.
                Odkaz platí <strong>1 hodinu</strong>.
              </p>
              <Link
                href="/login"
                className="block w-full text-center bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Späť na prihlásenie
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-medium">Zabudnuté heslo</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Zadajte váš e-mail a pošleme vám odkaz na nastavenie nového hesla.
                </p>
              </div>

              <form action={requestReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium">E-mail</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoFocus
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Odoslať odkaz
                </button>
              </form>

              <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                Späť na prihlásenie
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
