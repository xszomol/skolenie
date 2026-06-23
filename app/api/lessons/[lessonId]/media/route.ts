import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { uploadFile } from "@/lib/storage"

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp", "tiff", "tif"])
const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "avi", "mkv", "m4v"])
const AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus"])

function getMediaType(mime: string, filename: string): "image" | "video" | "audio" | null {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  // Fallback: extension-based detection (handles uppercase extensions, empty MIME types)
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  if (IMAGE_EXTS.has(ext)) return "image"
  if (VIDEO_EXTS.has(ext)) return "video"
  if (AUDIO_EXTS.has(ext)) return "audio"
  return null
}

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
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const mediaType = getMediaType(file.type, file.name)
  if (!mediaType) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
  const key = `lessons/${lessonId}/media/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await uploadFile(key, buffer, file.type)

  return NextResponse.json({ key, mediaType })
}
