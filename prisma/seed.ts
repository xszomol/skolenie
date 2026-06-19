import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12)

  const user = await prisma.user.upsert({
    where: { email: "admin@skolenie.local" },
    update: {},
    create: {
      email: "admin@skolenie.local",
      firstName: "Admin",
      lastName: "Skolenie",
      passwordHash,
      roles: {
        create: [{ role: "ADMIN" }, { role: "TRAINER" }],
      },
    },
  })

  console.log(`Seed user: ${user.email} / admin123`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
