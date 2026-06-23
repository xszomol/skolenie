import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { GraduationCap, LogOut, Users } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  async function logout() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <nav className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/courses" className="flex items-center gap-2 font-semibold text-lg group">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground group-hover:opacity-90 transition-opacity">
              <GraduationCap className="h-5 w-5" />
            </span>
            Školenie
          </Link>

          <div className="flex items-center gap-3">
            {session.user.roles.includes("ADMIN") && (
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Používatelia</span>
              </Link>
            )}
            <ThemeToggle />

            <Link href="/profile" className="flex items-center gap-2 pl-1 rounded-md px-2 py-1 hover:bg-muted transition-colors">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {initials(session.user.name)}
              </span>
              <span className="text-sm font-medium hidden sm:inline">{session.user.name}</span>
            </Link>

            <form action={logout}>
              <button
                type="submit"
                title="Odhlásiť sa"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Odhlásiť</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  )
}
