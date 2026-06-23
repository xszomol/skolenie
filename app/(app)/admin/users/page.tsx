import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Users } from "lucide-react"

const roleConfig: Record<string, { label: string; chip: string }> = {
  ADMIN:       { label: "Admin",     chip: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300" },
  TRAINER:     { label: "Školiteľ",  chip: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
  PARTICIPANT: { label: "Účastník",  chip: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" },
}

const ROLE_ORDER = ["ADMIN", "TRAINER", "PARTICIPANT"]

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.user.roles.includes("ADMIN")) notFound()

  const users = await prisma.user.findMany({
    include: { roles: { orderBy: { role: "asc" } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Používatelia</h1>
          <p className="text-sm text-muted-foreground">{users.length} registrovaných</p>
        </div>
      </div>

      <div className="border rounded-xl bg-card divide-y overflow-hidden">
        {users.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Žiadni používatelia.</p>
        ) : (
          users.map((user) => {
            const sortedRoles = [...user.roles].sort(
              (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
            )
            return (
              <div key={user.id} className="flex items-center gap-4 px-5 py-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground select-none">
                  {user.firstName[0]?.toUpperCase()}{user.lastName[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {sortedRoles.map(({ role }) => {
                    const cfg = roleConfig[role]
                    return (
                      <span
                        key={role}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.chip}`}
                      >
                        {cfg.label}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
