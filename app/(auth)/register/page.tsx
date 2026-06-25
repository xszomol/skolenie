import { prisma } from "@/lib/db"
import { signIn } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { checkRateLimit } from "@/lib/rate-limit"
import { sendRegistrationConfirmationEmail } from "@/lib/email"
import bcrypt from "bcryptjs"
import Link from "next/link"
import { GraduationCap, MailCheck } from "lucide-react"

// ── Open trainer self-registration (no token) ─────────────────────────────

function TrainerRegisterPage({ error }: { error?: string }) {
  async function registerTrainer(formData: FormData) {
    "use server"
    const headersList = await headers()
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
      headersList.get("x-real-ip") ??
      "unknown"
    if (!checkRateLimit(`trainer-reg:${ip}`, 5, 60 * 60 * 1000)) {
      redirect("/register?error=too-many")
    }

    const firstName = (formData.get("firstName") as string).trim()
    const lastName  = (formData.get("lastName")  as string).trim()
    const email     = (formData.get("email")      as string).trim().toLowerCase()
    const password  = formData.get("password") as string

    if (!firstName || !lastName || !email || !password) redirect("/register?error=invalid")
    if (password.length < 8) redirect("/register?error=weak-password")

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) redirect("/register?error=email-taken")

    const passwordHash = await bcrypt.hash(password, 12)
    const pending = await prisma.pendingTrainerRegistration.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    await sendRegistrationConfirmationEmail({ to: email, firstName, token: pending.token }).catch(() => {})

    redirect("/register?sent=1")
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
            <p className="text-sm text-muted-foreground">Registrácia školiteľa</p>
          </div>
        </div>

        <div className="space-y-5 p-8 bg-card border rounded-xl shadow-lg">
          {error === "email-taken" && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              Tento e-mail je už zaregistrovaný. <Link href="/login" className="underline">Prihláste sa.</Link>
            </p>
          )}
          {error === "weak-password" && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              Heslo musí mať aspoň 8 znakov.
            </p>
          )}
          {error === "too-many" && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              Príliš veľa pokusov. Skúste to neskôr.
            </p>
          )}
          {error === "invalid" && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              Vyplňte všetky polia.
            </p>
          )}

          <form action={registerTrainer} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="text-sm font-medium">Meno</label>
                <input
                  id="firstName"
                  name="firstName"
                  required
                  autoFocus
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
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Heslo</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              />
              <p className="text-xs text-muted-foreground">Minimálne 8 znakov.</p>
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Zaregistrovať sa
            </button>
          </form>

          <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            Už máte účet? Prihláste sa
          </Link>
        </div>
      </div>
    </div>
  )
}

function TrainerRegisterSentPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/60 via-background to-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-semibold">Školenie</h1>
        </div>

        <div className="p-8 bg-card border rounded-xl shadow-lg space-y-4">
          <div className="flex items-center gap-3">
            <MailCheck className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Skontrolujte svoju e-mailovú schránku.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Poslali sme vám odkaz na potvrdenie registrácie. Platí 24 hodín.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="block w-full text-center border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Späť na prihlásenie
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Invitation flow (with token) ──────────────────────────────────────────

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string; sent?: string }>
}) {
  const { token, error, sent } = await searchParams

  if (!token && sent === "1") return <TrainerRegisterSentPage />
  if (!token) return <TrainerRegisterPage error={error} />

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
