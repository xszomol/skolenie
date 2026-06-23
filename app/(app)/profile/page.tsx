import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ProfileForm } from "./_components/ProfileForm"
import { PasswordForm } from "./_components/PasswordForm"

export default async function ProfilePage() {
  const session = await auth()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, lastName: true, email: true },
  })
  if (!user) notFound()

  return (
    <div className="max-w-lg space-y-8">
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kurzy
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">Môj profil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
      </div>

      <div className="border rounded-xl divide-y">
        <div className="p-6">
          <ProfileForm firstName={user.firstName} lastName={user.lastName} />
        </div>
        <div className="p-6">
          <PasswordForm />
        </div>
      </div>
    </div>
  )
}
