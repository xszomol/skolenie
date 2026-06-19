import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createCourse } from "./actions"

export default async function NewCoursePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const roles = session.user.roles ?? []
  if (!roles.some((r) => ["ADMIN", "TRAINER"].includes(r))) redirect("/courses")

  const isTrainer = roles.includes("TRAINER")

  const availableTrainers = !isTrainer
    ? await prisma.user.findMany({
        where: { roles: { some: { role: "TRAINER" } } },
        orderBy: { lastName: "asc" },
      })
    : []

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nové školenie</h1>

      <form action={createCourse} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Názov školenia *
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            Popis *
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="startDate" className="text-sm font-medium">
              Dátum začiatku *
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="endDate" className="text-sm font-medium">
              Dátum konca *
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              required
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="materialsAfterEnd"
            name="materialsAfterEnd"
            type="checkbox"
            className="h-4 w-4 rounded border"
          />
          <label htmlFor="materialsAfterEnd" className="text-sm">
            Materiály dostupné aj po skončení kurzu
          </label>
        </div>

        {!isTrainer && (
          <div className="space-y-1.5">
            <label htmlFor="primaryTrainerId" className="text-sm font-medium">
              Hlavný školiteľ *
            </label>
            {availableTrainers.length === 0 ? (
              <p className="text-sm text-destructive">
                V systéme nie sú žiadni školitelia. Najprv pozvite školiteľa.
              </p>
            ) : (
              <select
                id="primaryTrainerId"
                name="primaryTrainerId"
                required
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">Vyberte školiteľa...</option>
                {availableTrainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} ({t.email})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <hr />

        <div className="space-y-1.5">
          <label htmlFor="participantEmails" className="text-sm font-medium">
            E-maily účastníkov
          </label>
          <textarea
            id="participantEmails"
            name="participantEmails"
            rows={3}
            placeholder={"jan.novak@firma.sk\nmaria.horakova@firma.sk"}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Jeden e-mail na riadok. Účastníci dostanú pozvánku do kurzu.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="trainerEmails" className="text-sm font-medium">
            E-maily ďalších školiteľov
          </label>
          <textarea
            id="trainerEmails"
            name="trainerEmails"
            rows={2}
            placeholder="kolega@firma.sk"
            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none font-mono"
          />
          <p className="text-xs text-muted-foreground">Jeden e-mail na riadok.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Vytvoriť školenie
          </button>
          <Link
            href="/courses"
            className="rounded-md px-6 py-2 text-sm border hover:bg-muted transition-colors"
          >
            Zrušiť
          </Link>
        </div>
      </form>
    </div>
  )
}
