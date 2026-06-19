import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { uploadFile } from "@/lib/storage"
import { convertToPages } from "@/lib/convert"

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { include: { trainers: true } } },
  })
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const roles = session.user.roles ?? []
  const userId = session.user.id
  const isAdmin = roles.includes("ADMIN")
  const isCourseTrainer =
    roles.includes("TRAINER") &&
    (lesson.course.primaryTrainerId === userId ||
      lesson.course.trainers.some((t) => t.userId === userId))

  if (!isAdmin && !isCourseTrainer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Povolené sú iba súbory PDF, PPT a PPTX" },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf"

  // Store the original file
  await uploadFile(`lessons/${lessonId}/source.${ext}`, buffer, file.type)

  // Convert to page images and create LessonPage records
  const pageKeys = await convertToPages(buffer, ext, lessonId)

  await prisma.$transaction([
    prisma.lessonPage.deleteMany({ where: { lessonId } }),
    prisma.lessonPage.createMany({
      data: pageKeys.map((key, i) => ({
        lessonId,
        order: i + 1,
        content: [{ type: "image", key }],
      })),
    }),
  ])

  return NextResponse.json({ pages: pageKeys.length })
}
