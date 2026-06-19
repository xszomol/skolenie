import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { createInvitation } from "@/lib/invitations"

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "TRAINER", "PARTICIPANT"]),
  courseId: z.string().optional(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const roles = session.user.roles ?? []

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const { email, role, courseId } = parsed.data

  if (role === "ADMIN" && !roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (role === "TRAINER" && !roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (role === "PARTICIPANT") {
    if (!roles.some((r) => ["ADMIN", "TRAINER"].includes(r))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required for PARTICIPANT invitations" },
        { status: 400 }
      )
    }
  }

  const invitation = await createInvitation({
    email,
    role,
    courseId,
    invitedById: session.user.id,
  })

  return NextResponse.json({ id: invitation.id }, { status: 201 })
}
